import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { UserRole } from '../users/enums/user-role.enum.js';
import { EventStatus } from '../events/enums/event-status.enum.js';
import { isPackageOnSale } from '../events/inventory/inventory.calculator.js';
import { Event, EventDocument } from '../events/schemas/event.schema.js';
import {
  TicketPackage,
  TicketPackageDocument,
} from '../events/schemas/ticket-package.schema.js';
import { TicketPackagesService } from '../events/ticket-packages.service.js';
import { BookingStatus } from './enums/booking-status.enum.js';
import { TicketStatus } from './enums/ticket-status.enum.js';
import type { BookingLineItemDto, BookingRequestDto } from './dto/booking-items.dto.js';
import { Booking, BookingDocument } from './schemas/booking.schema.js';
import { Ticket, TicketDocument } from './schemas/ticket.schema.js';
import {
  generateBookingReference,
  generateQrToken,
  generateTicketCode,
} from './utils/tokens.util.js';

type PreparedLine = {
  packageId: Types.ObjectId;
  packageName: string;
  priceMinor: number;
  admissionCount: number;
  quantity: number;
  lineTotalMinor: number;
};

type QuoteResult = {
  eventId: string;
  items: PreparedLine[];
  totalMinor: number;
};

const ACTIVE_BOOKING_STATUSES = [BookingStatus.Confirmed, BookingStatus.Pending];

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Ticket.name) private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(TicketPackage.name)
    private readonly packageModel: Model<TicketPackageDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly packagesService: TicketPackagesService,
  ) {}

  async quote(userId: string, dto: BookingRequestDto): Promise<QuoteResult> {
    const prepared = await this.prepareBooking(userId, dto);
    return {
      eventId: dto.eventId,
      items: prepared.items,
      totalMinor: prepared.totalMinor,
    };
  }

  async create(userId: string, dto: BookingRequestDto) {
    const prepared = await this.prepareBooking(userId, dto);

    const session = await this.connection.startSession();
    try {
      const result = await session.withTransaction(async () => {
        for (const item of prepared.items) {
          const updated = await this.packageModel.findOneAndUpdate(
            {
              _id: item.packageId,
              $expr: {
                $lte: [
                  { $add: ['$quantitySold', item.quantity] },
                  '$quantityTotal',
                ],
              },
            },
            { $inc: { quantitySold: item.quantity } },
            { returnDocument: 'after', session },
          );

          if (!updated) {
            throw new ConflictException(
              'Insufficient inventory for one or more packages',
            );
          }
        }

        const booking = await this.bookingModel.create(
          [
            {
              userId: new Types.ObjectId(userId),
              eventId: new Types.ObjectId(dto.eventId),
              reference: generateBookingReference(),
              items: prepared.items,
              totalMinor: prepared.totalMinor,
              status: BookingStatus.Confirmed,
            },
          ],
          { session },
        ).then((rows) => rows[0]!);

        const ticketRows: Array<Partial<Ticket>> = [];
        for (const item of prepared.items) {
          const admissionTickets = item.quantity * item.admissionCount;
          for (let i = 0; i < admissionTickets; i += 1) {
            ticketRows.push({
              bookingId: booking._id,
              eventId: booking.eventId,
              packageId: item.packageId,
              ticketCode: generateTicketCode(),
              qrToken: generateQrToken(),
              status: TicketStatus.Valid,
            });
          }
        }

        const tickets = await this.ticketModel.create(ticketRows, {
          session,
          ordered: true,
        });

        return { booking, tickets };
      });

      if (!result) {
        throw new ConflictException('Booking could not be completed');
      }

      await this.packagesService.refreshEventSoldOutStatus(
        new Types.ObjectId(dto.eventId),
      );

      return result;
    } finally {
      await session.endSession();
    }
  }

  async listMine(userId: string) {
    return this.bookingModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getByIdForUser(bookingId: string, userId: string, role: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Booking not found');
    }

    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (
      booking.userId.toString() !== userId &&
      role !== UserRole.Admin
    ) {
      throw new ForbiddenException('You cannot access this booking');
    }

    return booking;
  }

  async listTicketsForBooking(bookingId: string, userId: string, role: string) {
    const booking = await this.getByIdForUser(bookingId, userId, role);
    return this.ticketModel.find({ bookingId: booking._id }).exec();
  }

  async cancel(bookingId: string, userId: string) {
    if (!Types.ObjectId.isValid(bookingId)) {
      throw new NotFoundException('Booking not found');
    }

    const session = await this.connection.startSession();
    try {
      const booking = await session.withTransaction(async () => {
        const row = await this.bookingModel
          .findOne({
            _id: bookingId,
            userId: new Types.ObjectId(userId),
            status: BookingStatus.Confirmed,
          })
          .session(session)
          .exec();

        if (!row) {
          throw new NotFoundException('Booking not found or not cancellable');
        }

        const event = await this.eventModel
          .findById(row.eventId)
          .session(session)
          .exec();

        if (!event || event.status === EventStatus.Completed) {
          throw new BadRequestException('This booking cannot be cancelled');
        }

        for (const item of row.items) {
          const updated = await this.packageModel.findOneAndUpdate(
            {
              _id: item.packageId,
              quantitySold: { $gte: item.quantity },
            },
            { $inc: { quantitySold: -item.quantity } },
            { returnDocument: 'after', session },
          );

          if (!updated) {
            throw new ConflictException('Unable to restore inventory');
          }
        }

        row.status = BookingStatus.Cancelled;
        await row.save({ session });

        await this.ticketModel.updateMany(
          { bookingId: row._id, status: TicketStatus.Valid },
          { status: TicketStatus.Cancelled },
          { session },
        );

        return row;
      });

      if (!booking) {
        throw new NotFoundException('Booking not found or not cancellable');
      }

      await this.packagesService.refreshEventSoldOutStatus(booking.eventId);

      return booking;
    } finally {
      await session.endSession();
    }
  }

  private async prepareBooking(userId: string, dto: BookingRequestDto) {
    if (!Types.ObjectId.isValid(dto.eventId)) {
      throw new NotFoundException('Event not found');
    }

    const event = await this.eventModel.findById(dto.eventId).exec();
    if (!event || event.status !== EventStatus.Published) {
      throw new BadRequestException('Event is not open for booking');
    }

    const merged = this.mergeDuplicateItems(dto.items);
    const packages = await this.loadPackages(dto.eventId, merged);

    const existingCounts = await this.getExistingPurchaseCounts(
      userId,
      dto.eventId,
    );

    let requestedEventTotal = 0;
    const preparedItems: PreparedLine[] = [];
    let totalMinor = 0;
    const now = new Date();

    for (const line of merged) {
      const pkg = packages.get(line.packageId);
      if (!pkg) {
        throw new BadRequestException('Invalid package for this event');
      }

      if (!isPackageOnSale(pkg, now)) {
        throw new BadRequestException(`Package "${pkg.name}" is not on sale`);
      }

      const remaining = pkg.quantityTotal - pkg.quantitySold;
      if (line.quantity > remaining) {
        throw new BadRequestException(
          `Only ${remaining} remaining for "${pkg.name}"`,
        );
      }

      const packageAlready = existingCounts.byPackage.get(line.packageId) ?? 0;
      if (pkg.perUserLimit && packageAlready + line.quantity > pkg.perUserLimit) {
        throw new BadRequestException(
          `Purchase limit exceeded for "${pkg.name}"`,
        );
      }

      requestedEventTotal += line.quantity;
      const lineTotalMinor = pkg.priceMinor * line.quantity;
      totalMinor += lineTotalMinor;

      preparedItems.push({
        packageId: pkg._id,
        packageName: pkg.name,
        priceMinor: pkg.priceMinor,
        admissionCount: pkg.admissionCount,
        quantity: line.quantity,
        lineTotalMinor,
      });

      existingCounts.byPackage.set(
        line.packageId,
        packageAlready + line.quantity,
      );
    }

    if (
      event.perUserTicketLimit &&
      existingCounts.eventTotal + requestedEventTotal > event.perUserTicketLimit
    ) {
      throw new BadRequestException('Event ticket limit exceeded for your account');
    }

    const admissionsRequested = preparedItems.reduce(
      (sum, item) => sum + item.quantity * item.admissionCount,
      0,
    );
    if (admissionsRequested > event.capacity) {
      throw new BadRequestException('Booking exceeds event capacity');
    }

    return { items: preparedItems, totalMinor };
  }

  private mergeDuplicateItems(items: BookingLineItemDto[]) {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.packageId, (map.get(item.packageId) ?? 0) + item.quantity);
    }
    return [...map.entries()].map(([packageId, quantity]) => ({
      packageId,
      quantity,
    }));
  }

  private async loadPackages(eventId: string, lines: { packageId: string }[]) {
    const ids = lines.map((l) => new Types.ObjectId(l.packageId));
    const rows = await this.packageModel
      .find({ _id: { $in: ids }, eventId: new Types.ObjectId(eventId) })
      .exec();

    const map = new Map<string, TicketPackageDocument>();
    for (const row of rows) {
      map.set(row._id.toString(), row);
    }
    return map;
  }

  private async getExistingPurchaseCounts(userId: string, eventId: string) {
    const bookings = await this.bookingModel
      .find({
        userId: new Types.ObjectId(userId),
        eventId: new Types.ObjectId(eventId),
        status: { $in: ACTIVE_BOOKING_STATUSES },
      })
      .exec();

    let eventTotal = 0;
    const byPackage = new Map<string, number>();

    for (const booking of bookings) {
      for (const item of booking.items) {
        eventTotal += item.quantity;
        const key = item.packageId.toString();
        byPackage.set(key, (byPackage.get(key) ?? 0) + item.quantity);
      }
    }

    return { eventTotal, byPackage };
  }
}
