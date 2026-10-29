import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service.js';
import type { CreateEventDto } from './dto/create-event.dto.js';
import type { ListEventsQueryDto } from './dto/list-events-query.dto.js';
import type { UpdateEventDto } from './dto/update-event.dto.js';
import { EventStatus, type EventStatus as EventStatusType } from './enums/event-status.enum.js';
import {
  assertStatusTransition,
  isEventEditable,
} from './event-status.transitions.js';
import {
  applyCardImagesToDocument,
  normalizeCardImageInput,
} from './event-images.util.js';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema.js';
import {
  GatekeeperAssignment,
  GatekeeperAssignmentDocument,
} from '../gatekeeper/schemas/gatekeeper-assignment.schema.js';
import { Event, EventDocument } from './schemas/event.schema.js';
import { TicketPackagesService } from './ticket-packages.service.js';

const PUBLIC_STATUSES: EventStatus[] = [
  EventStatus.Published,
  EventStatus.SoldOut,
  EventStatus.Completed,
];

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(GatekeeperAssignment.name)
    private readonly assignmentModel: Model<GatekeeperAssignmentDocument>,
    private readonly packagesService: TicketPackagesService,
    private readonly auditService: AuditService,
  ) {}

  private validateDates(startAt: Date, endAt: Date) {
    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }
  }

  async create(dto: CreateEventDto, actorId: string) {
    this.validateDates(dto.startAt, dto.endAt);

    const images = normalizeCardImageInput(dto);
    const event = await this.eventModel.create({
      title: dto.title.trim(),
      description: dto.description.trim(),
      category: dto.category.trim(),
      bannerUrl: images?.bannerUrl,
      cardImageUrls: images?.cardImageUrls ?? [],
      heroImageUrl: dto.heroImageUrl?.trim(),
      listingBadge: dto.listingBadge,
      venue: dto.venue.trim(),
      address: dto.address.trim(),
      startAt: dto.startAt,
      endAt: dto.endAt,
      timezone: dto.timezone.trim(),
      capacity: dto.capacity,
      status: EventStatus.Draft,
      perUserTicketLimit: dto.perUserTicketLimit,
      cancellationPolicy: dto.cancellationPolicy?.trim(),
      refundPolicy: dto.refundPolicy?.trim(),
      instructions: dto.instructions?.trim(),
      createdBy: new Types.ObjectId(actorId),
    });

    await this.auditService.log({
      actorId,
      action: 'event.create',
      targetType: 'event',
      targetId: event._id.toString(),
    });

    return event;
  }

  async update(eventId: string, dto: UpdateEventDto, actorId: string) {
    const event = await this.findByIdOrFail(eventId);

    if (!isEventEditable(event.status)) {
      throw new BadRequestException(
        `Events in status "${event.status}" cannot be edited`,
      );
    }

    const startAt = dto.startAt ?? event.startAt;
    const endAt = dto.endAt ?? event.endAt;
    this.validateDates(startAt, endAt);

    if (dto.title !== undefined) event.title = dto.title.trim();
    if (dto.description !== undefined) {
      event.description = dto.description.trim();
    }
    if (dto.category !== undefined) event.category = dto.category.trim();
    const images = normalizeCardImageInput(dto);
    if (images) {
      applyCardImagesToDocument(event, images);
    }
    if (dto.heroImageUrl !== undefined) {
      const trimmed = dto.heroImageUrl?.trim();
      event.heroImageUrl = trimmed || undefined;
    }
    if ('listingBadge' in dto) {
      event.listingBadge = dto.listingBadge ?? undefined;
    }
    if (dto.venue !== undefined) event.venue = dto.venue.trim();
    if (dto.address !== undefined) event.address = dto.address.trim();
    if (dto.startAt !== undefined) event.startAt = dto.startAt;
    if (dto.endAt !== undefined) event.endAt = dto.endAt;
    if (dto.timezone !== undefined) event.timezone = dto.timezone.trim();
    if (dto.capacity !== undefined) event.capacity = dto.capacity;
    if (dto.perUserTicketLimit !== undefined) {
      event.perUserTicketLimit = dto.perUserTicketLimit;
    }
    if (dto.cancellationPolicy !== undefined) {
      event.cancellationPolicy = dto.cancellationPolicy?.trim();
    }
    if (dto.refundPolicy !== undefined) {
      event.refundPolicy = dto.refundPolicy?.trim();
    }
    if (dto.instructions !== undefined) {
      event.instructions = dto.instructions?.trim();
    }

    await event.save();

    await this.auditService.log({
      actorId,
      action: 'event.update',
      targetType: 'event',
      targetId: event._id.toString(),
    });

    return event;
  }

  async updateStatus(eventId: string, status: EventStatus, actorId: string) {
    const event = await this.findByIdOrFail(eventId);
    assertStatusTransition(event.status, status);

    if (status === EventStatus.Published) {
      const activePackages = await this.packagesService.countActiveByEvent(
        event._id,
      );
      if (activePackages < 1) {
        throw new BadRequestException(
          'Publish requires at least one active ticket package',
        );
      }
    }

    event.status = status;
    await event.save();

    await this.auditService.log({
      actorId,
      action: 'event.status_change',
      targetType: 'event',
      targetId: event._id.toString(),
      metadata: { status },
    });

    return event;
  }

  async listPublic(query: ListEventsQueryDto) {
    const filter: {
      status: { $in: EventStatusType[] };
      category?: string;
      startAt?: { $gte?: Date; $lte?: Date };
    } = {
      status: { $in: PUBLIC_STATUSES },
    };

    if (query.category) {
      filter.category = query.category.trim();
    }
    if (query.from || query.to) {
      filter.startAt = {};
      if (query.from) filter.startAt.$gte = query.from;
      if (query.to) filter.startAt.$lte = query.to;
    }

    return this.eventModel.find(filter).sort({ startAt: 1 }).exec();
  }

  async getPublicById(eventId: string) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundException('Event not found');
    }

    const event = await this.eventModel
      .findOne({
        _id: eventId,
        status: { $in: PUBLIC_STATUSES },
      })
      .exec();

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async findByIdOrFail(eventId: string) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundException('Event not found');
    }
    const event = await this.eventModel.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  async listAdmin() {
    return this.eventModel.find().sort({ startAt: -1 }).exec();
  }

  async remove(eventId: string, actorId: string) {
    const event = await this.findByIdOrFail(eventId);
    const eventObjectId = event._id;

    const bookingCount = await this.bookingModel
      .countDocuments({ eventId: eventObjectId })
      .exec();
    if (bookingCount > 0) {
      throw new BadRequestException(
        'Cannot delete an event that has bookings. Cancel bookings first or keep the event archived.',
      );
    }

    await this.packagesService.deleteAllForEvent(eventObjectId);
    await this.assignmentModel
      .deleteMany({ eventId: eventObjectId })
      .exec();

    await event.deleteOne();

    await this.auditService.log({
      actorId,
      action: 'event.delete',
      targetType: 'event',
      targetId: eventId,
      metadata: { title: event.title },
    });

    return { ok: true as const };
  }
}
