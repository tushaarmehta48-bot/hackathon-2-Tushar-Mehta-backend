import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
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
        message: 'Invalid ticket',
      };
    }

    if (ticket.status === TicketStatus.Cancelled) {
      await this.logAttempt(ticket, gatekeeperId, dto, CheckInResult.Cancelled);
      return {
        result: CheckInResult.Cancelled,
        message: 'Ticket is cancelled',
      };
    }

    if (ticket.status === TicketStatus.CheckedIn) {
      await this.logAttempt(ticket, gatekeeperId, dto, CheckInResult.AlreadyUsed);
      return {
        result: CheckInResult.AlreadyUsed,
        message: 'Ticket already checked in',
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
        const row = await this.ticketModel.findOneAndUpdate(
          {
            _id: ticket._id,
            status: TicketStatus.Valid,
          },
          {
            $set: {
              status: TicketStatus.CheckedIn,
              checkedInAt: new Date(),
              checkedInBy: new Types.ObjectId(gatekeeperId),
              gateId: dto.gateId?.trim(),
            },
          },
          { returnDocument: 'after', session },
        );

        if (!row) {
          return null;
        }

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
          message: 'Ticket already checked in',
        };
      }

      const response: CheckInResponse = {
        result: CheckInResult.Success,
        message: 'Check-in successful',
        ticket: this.toTicketSummary(updated),
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
    return {
      id: ticket._id.toString(),
      ticketCode: ticket.ticketCode,
      eventId: ticket.eventId.toString(),
      status: ticket.status,
      checkedInAt: ticket.checkedInAt,
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
