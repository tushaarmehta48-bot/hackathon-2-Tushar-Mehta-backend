import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BookingStatus } from '../bookings/enums/booking-status.enum.js';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema.js';
import { EventStatus } from '../events/enums/event-status.enum.js';
import { Event, EventDocument } from '../events/schemas/event.schema.js';
import type { ListFeedbackQueryDto } from './dto/list-feedback-query.dto.js';
import type { SubmitFeedbackDto } from './dto/submit-feedback.dto.js';
import { ModerationStatus } from './enums/moderation-status.enum.js';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema.js';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private readonly feedbackModel: Model<FeedbackDocument>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
  ) {}

  async submit(eventId: string, userId: string, dto: SubmitFeedbackDto) {
    if (!Types.ObjectId.isValid(eventId) || !Types.ObjectId.isValid(dto.bookingId)) {
      throw new NotFoundException('Event or booking not found');
    }

    const event = await this.eventModel.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.assertFeedbackWindowOpen(event);

    const booking = await this.bookingModel.findById(dto.bookingId).exec();
    if (
      !booking ||
      booking.userId.toString() !== userId ||
      booking.eventId.toString() !== eventId
    ) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.Confirmed) {
      throw new BadRequestException('Only confirmed bookings can receive feedback');
    }

    const existing = await this.feedbackModel
      .findOne({ bookingId: booking._id })
      .exec();
    if (existing) {
      throw new ConflictException('Feedback already submitted for this booking');
    }

    const feedback = await this.feedbackModel.create({
      userId: new Types.ObjectId(userId),
      bookingId: booking._id,
      eventId: event._id,
      rating: dto.rating,
      comment: dto.comment?.trim(),
      moderationStatus: ModerationStatus.Visible,
    });

    return feedback;
  }

  async listAdmin(query: ListFeedbackQueryDto) {
    const filter: {
      eventId?: Types.ObjectId;
      moderationStatus?: ModerationStatus;
    } = {};

    if (query.eventId) {
      if (!Types.ObjectId.isValid(query.eventId)) {
        return [];
      }
      filter.eventId = new Types.ObjectId(query.eventId);
    }
    if (query.moderationStatus) {
      filter.moderationStatus = query.moderationStatus;
    }

    return this.feedbackModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();
  }

  async moderate(feedbackId: string, moderationStatus: ModerationStatus) {
    if (!Types.ObjectId.isValid(feedbackId)) {
      throw new NotFoundException('Feedback not found');
    }

    const feedback = await this.feedbackModel.findById(feedbackId).exec();
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    feedback.moderationStatus = moderationStatus;
    await feedback.save();
    return feedback;
  }

  toPublic(feedback: FeedbackDocument) {
    return {
      id: feedback._id.toString(),
      eventId: feedback.eventId.toString(),
      bookingId: feedback.bookingId.toString(),
      rating: feedback.rating,
      comment: feedback.comment,
      moderationStatus: feedback.moderationStatus,
      createdAt: feedback.createdAt,
    };
  }

  toAdmin(feedback: FeedbackDocument) {
    return {
      ...this.toPublic(feedback),
      userId: feedback.userId.toString(),
    };
  }

  private assertFeedbackWindowOpen(event: EventDocument) {
    const now = new Date();
    const eventEnded =
      event.status === EventStatus.Completed ||
      event.status === EventStatus.Cancelled ||
      event.endAt <= now;

    if (!eventEnded) {
      throw new BadRequestException(
        'Feedback is available after the event has ended',
      );
    }
  }
}
