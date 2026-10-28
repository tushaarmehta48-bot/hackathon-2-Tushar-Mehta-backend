import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { TicketStatus } from '../bookings/enums/ticket-status.enum.js';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema.js';
import { Ticket, TicketDocument } from '../bookings/schemas/ticket.schema.js';
import { Event, EventDocument } from '../events/schemas/event.schema.js';
import {
  TicketPackage,
  TicketPackageDocument,
} from '../events/schemas/ticket-package.schema.js';
import { CheckIn, CheckInDocument } from '../gatekeeper/schemas/check-in.schema.js';
import type { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto.js';
import type { AdminCheckInsQueryDto } from './dto/admin-check-ins-query.dto.js';

export type EventAnalytics = {
  eventId: string;
  title: string;
  status: string;
  capacity: number;
  packagesActive: number;
  ticketsTotal: number;
  ticketsSold: number;
  ticketsRemaining: number;
  admissionsSold: number;
  admissionsCheckedIn: number;
  checkInRate: number;
  revenueMinor: number;
  confirmedBookings: number;
};

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(TicketPackage.name)
    private readonly packageModel: Model<TicketPackageDocument>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
  ) {}

  async getAnalytics(query: AdminAnalyticsQueryDto) {
    if (query.eventId) {
      const row = await this.buildEventAnalytics(query.eventId);
      return { analytics: row };
    }

    const events = await this.eventModel.find().sort({ startAt: -1 }).exec();
    const analytics = await Promise.all(
      events.map((event) => this.buildEventAnalytics(event._id.toString())),
    );
    return { analytics };
  }

  async listCheckIns(query: AdminCheckInsQueryDto) {
    const filter: {
      eventId?: Types.ObjectId;
      gatekeeperId?: Types.ObjectId;
      gateId?: string;
      result?: string;
      timestamp?: { $gte?: Date; $lte?: Date };
    } = {};

    if (query.eventId) {
      if (!Types.ObjectId.isValid(query.eventId)) {
        return { checkIns: [] };
      }
      filter.eventId = new Types.ObjectId(query.eventId);
    }
    if (query.gatekeeperId) {
      filter.gatekeeperId = new Types.ObjectId(query.gatekeeperId);
    }
    if (query.gateId) {
      filter.gateId = query.gateId;
    }
    if (query.result) {
      filter.result = query.result;
    }
    if (query.from || query.to) {
      filter.timestamp = {};
      if (query.from) filter.timestamp.$gte = query.from;
      if (query.to) filter.timestamp.$lte = query.to;
    }

    let checkIns = await this.checkInModel
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(500)
      .exec();

    if (query.packageId) {
      if (!Types.ObjectId.isValid(query.packageId)) {
        return { checkIns: [] };
      }
      const packageObjectId = new Types.ObjectId(query.packageId);
      const ticketIds = checkIns.map((row) => row.ticketId);
      const tickets = await this.ticketModel
        .find({ _id: { $in: ticketIds }, packageId: packageObjectId })
        .select('_id')
        .exec();
      const allowed = new Set(tickets.map((t) => t._id.toString()));
      checkIns = checkIns.filter((row) => allowed.has(row.ticketId.toString()));
    }

    const ticketIds = checkIns.map((row) => row.ticketId);
    const tickets = await this.ticketModel
      .find({ _id: { $in: ticketIds } })
      .select('ticketCode packageId bookingId eventId status')
      .exec();
    const ticketMap = new Map(tickets.map((t) => [t._id.toString(), t]));

    const bookingIds = tickets.map((t) => t.bookingId);
    const bookings = await this.bookingModel
      .find({ _id: { $in: bookingIds } })
      .select('reference')
      .exec();
    const bookingMap = new Map(bookings.map((b) => [b._id.toString(), b]));

    return {
      checkIns: checkIns.map((row) => {
        const ticket = ticketMap.get(row.ticketId.toString());
        const booking = ticket
          ? bookingMap.get(ticket.bookingId.toString())
          : undefined;

        return {
          id: row._id.toString(),
          eventId: row.eventId.toString(),
          gatekeeperId: row.gatekeeperId.toString(),
          gateId: row.gateId,
          result: row.result,
          timestamp: row.timestamp,
          ticketCode: ticket?.ticketCode,
          ticketStatus: ticket?.status,
          packageId: ticket?.packageId.toString(),
          bookingReference: booking?.reference,
        };
      }),
    };
  }

  private async buildEventAnalytics(eventId: string): Promise<EventAnalytics> {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundException('Event not found');
    }

    const event = await this.eventModel.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const packages = await this.packageModel
      .find({ eventId: event._id, active: true })
      .exec();

    const ticketsTotal = packages.reduce((sum, p) => sum + p.quantityTotal, 0);
    const ticketsSold = packages.reduce((sum, p) => sum + p.quantitySold, 0);
    const admissionsSold = packages.reduce(
      (sum, p) => sum + p.quantitySold * p.admissionCount,
      0,
    );

    const admissionsCheckedIn = await this.ticketModel.countDocuments({
      eventId: event._id,
      status: TicketStatus.CheckedIn,
    });

    const revenueAgg = await this.bookingModel.aggregate<{ total: number }>([
      {
        $match: {
          eventId: event._id,
          status: BookingStatus.Confirmed,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalMinor' },
        },
      },
    ]);

    const confirmedBookings = await this.bookingModel.countDocuments({
      eventId: event._id,
      status: BookingStatus.Confirmed,
    });

    const checkInRate =
      admissionsSold > 0 ? admissionsCheckedIn / admissionsSold : 0;

    return {
      eventId: event._id.toString(),
      title: event.title,
      status: event.status,
      capacity: event.capacity,
      packagesActive: packages.length,
      ticketsTotal,
      ticketsSold,
      ticketsRemaining: Math.max(0, ticketsTotal - ticketsSold),
      admissionsSold,
      admissionsCheckedIn,
      checkInRate: Math.round(checkInRate * 1000) / 1000,
      revenueMinor: revenueAgg[0]?.total ?? 0,
      confirmedBookings,
    };
  }
}
