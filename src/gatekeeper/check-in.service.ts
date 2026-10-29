import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { TicketStatus } from '../bookings/enums/ticket-status.enum.js';
import { Ticket, TicketDocument } from '../bookings/schemas/ticket.schema.js';
import { EventStatus } from '../events/enums/event-status.enum.js';
import { Event, EventDocument } from '../events/schemas/event.schema.js';
import type { CheckInDto } from './dto/check-in.dto.js';
import { CheckInResult } from './enums/check-in-result.enum.js';
import { RealtimeEmitterService } from '../realtime/realtime-emitter.service.js';
import { GatekeeperAssignmentsService } from './gatekeeper-assignments.service.js';
import { CheckIn, CheckInDocument } from './schemas/check-in.schema.js';

export type CheckInResponse = {
  result: CheckInResult;
  message: string;
  ticket?: {
    id: string;
    ticketCode: string;
    eventId: string;
    status: string;
    checkedInAt?: Date;
    admissionsTotal: number;
    admissionsUsed: number;
    admissionsRemaining: number;
  };
};

@Injectable()
export class CheckInService {
  constructor(
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly assignmentsService: GatekeeperAssignmentsService,
    private readonly realtime: RealtimeEmitterService,
  ) {}

  async checkIn(gatekeeperId: string, dto: CheckInDto): Promise<CheckInResponse> {
    const ticket = await this.ticketModel
      .findOne({ qrToken: dto.qrToken.trim() })
      .exec();

    if (!ticket) {
      await this.logAttempt(null, gatekeeperId, dto, CheckInResult.Invalid);
      return {
        result: CheckInResult.Invalid,
        message: 'Invalid or unknown QR code',
      };
    }

    const admissionsTotal = ticket.admissionsTotal ?? 1;
    const admissionsUsed = ticket.admissionsUsed ?? 0;

    if (ticket.status === TicketStatus.Cancelled) {
      await this.logAttempt(ticket, gatekeeperId, dto, CheckInResult.Cancelled);
      return {
        result: CheckInResult.Cancelled,
        message: 'Ticket is cancelled',
      };
    }

    if (
      ticket.status === TicketStatus.CheckedIn ||
      admissionsUsed >= admissionsTotal
    ) {
      await this.logAttempt(ticket, gatekeeperId, dto, CheckInResult.AlreadyUsed);
      return {
        result: CheckInResult.AlreadyUsed,
        message: 'All admissions on this QR have already been used',
        ticket: this.toTicketSummary(ticket),
      };
    }

    const event = await this.eventModel.findById(ticket.eventId).exec();
    if (
      !event ||
      (event.status !== EventStatus.Published &&
        event.status !== EventStatus.SoldOut)
    ) {
      await this.logAttempt(ticket, gatekeeperId, dto, CheckInResult.WrongEvent);
      return {
        result: CheckInResult.WrongEvent,
        message: 'Event is not accepting check-ins',
      };
    }

    const assigned = await this.assignmentsService.hasActiveAssignment(
      gatekeeperId,
      ticket.eventId,
      dto.gateId,
    );

    if (!assigned) {
      await this.logAttempt(
        ticket,
        gatekeeperId,
        dto,
        CheckInResult.Unauthorised,
      );
      return {
        result: CheckInResult.Unauthorised,
        message: 'You are not assigned to this event or gate',
      };
    }

    const session = await this.connection.startSession();
    try {
      const updated = await session.withTransaction(async () => {
        const row = await this.ticketModel
          .findOne({
            _id: ticket._id,
            status: TicketStatus.Valid,
            $expr: {
              $lt: [
                { $ifNull: ['$admissionsUsed', 0] },
                { $ifNull: ['$admissionsTotal', 1] },
              ],
            },
          })
          .session(session);

        if (!row) {
          return null;
        }

        const total = row.admissionsTotal ?? 1;
        const nextUsed = (row.admissionsUsed ?? 0) + 1;
        row.admissionsUsed = nextUsed;
        row.checkedInAt = new Date();
        row.checkedInBy = new Types.ObjectId(gatekeeperId);
        row.gateId = dto.gateId?.trim();
        if (nextUsed >= total) {
          row.status = TicketStatus.CheckedIn;
        }
        await row.save({ session });

        await this.checkInModel.create(
          [
            {
              ticketId: row._id,
              eventId: row.eventId,
              gatekeeperId: new Types.ObjectId(gatekeeperId),
              gateId: dto.gateId?.trim(),
              result: CheckInResult.Success,
              timestamp: new Date(),
            },
          ],
          { session },
        );

        return row;
      });

      if (!updated) {
        await this.logAttempt(
          ticket,
          gatekeeperId,
          dto,
          CheckInResult.AlreadyUsed,
        );
        return {
          result: CheckInResult.AlreadyUsed,
          message: 'All admissions on this QR have already been used',
        };
      }

      const summary = this.toTicketSummary(updated);
      const remaining = summary.admissionsRemaining;
      const response: CheckInResponse = {
        result: CheckInResult.Success,
        message:
          remaining > 0
            ? `Checked in successfully (${summary.admissionsUsed} of ${summary.admissionsTotal} — ${remaining} left on this QR)`
            : `Checked in successfully — all ${summary.admissionsTotal} guest(s) on this QR are now in`,
        ticket: summary,
      };

      const checkedInTotal = await this.ticketModel.countDocuments({
        eventId: updated.eventId,
        status: TicketStatus.CheckedIn,
      });
      this.realtime.emitCheckInUpdate({
        eventId: updated.eventId.toString(),
        checkedInTotal,
        result: CheckInResult.Success,
      });

      return response;
    } finally {
      await session.endSession();
    }
  }

  private toTicketSummary(ticket: TicketDocument) {
    const admissionsTotal = ticket.admissionsTotal ?? 1;
    const admissionsUsed = ticket.admissionsUsed ?? 0;
    return {
      id: ticket._id.toString(),
      ticketCode: ticket.ticketCode,
      eventId: ticket.eventId.toString(),
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
      admissionsTotal,
      admissionsUsed,
      admissionsRemaining: Math.max(0, admissionsTotal - admissionsUsed),
    };
  }

  private async logAttempt(
    ticket: TicketDocument | null,
    gatekeeperId: string,
    dto: CheckInDto,
    result: CheckInResult,
  ) {
    if (!ticket) {
      return;
    }

    await this.checkInModel.create({
      ticketId: ticket._id,
      eventId: ticket.eventId,
      gatekeeperId: new Types.ObjectId(gatekeeperId),
      gateId: dto.gateId?.trim(),
      result,
      timestamp: new Date(),
    });
  }
}
