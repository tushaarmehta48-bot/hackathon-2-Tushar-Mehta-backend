import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  EVENT_STATUSES,
  EventStatus,
  type EventStatus as EventStatusType,
} from '../enums/event-status.enum.js';
import {
  LISTING_BADGES,
  type ListingBadge as ListingBadgeType,
} from '../enums/listing-badge.enum.js';

export type EventDocument = HydratedDocument<Event> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true, collection: 'events' })
export class Event {
  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 5000 })
  description!: string;

  @Prop({ required: true, trim: true, maxlength: 80 })
  category!: string;

  @Prop({ trim: true, maxlength: 2048 })
  bannerUrl?: string;

  @Prop({ type: [String], default: [] })
  cardImageUrls!: string[];

  /** Wide hero shown on the public event detail page (View event). */
  @Prop({ trim: true, maxlength: 2048 })
  heroImageUrl?: string;

  @Prop({ required: true, trim: true, maxlength: 200 })
  venue!: string;

  @Prop({ required: true, trim: true, maxlength: 500 })
  address!: string;

  @Prop({ required: true })
  startAt!: Date;

  @Prop({ required: true })
  endAt!: Date;

  @Prop({ required: true, trim: true, maxlength: 64 })
  timezone!: string;

  @Prop({ required: true, min: 1 })
  capacity!: number;

  @Prop({
    type: String,
    required: true,
    enum: EVENT_STATUSES,
    default: EventStatus.Draft,
  })
  status!: EventStatusType;

  /** Admin-set chip on public listings (Live / Upcoming). */
  @Prop({ type: String, enum: LISTING_BADGES, required: false })
  listingBadge?: ListingBadgeType;

  @Prop({ min: 1 })
  perUserTicketLimit?: number;

  @Prop({ trim: true, maxlength: 2000 })
  cancellationPolicy?: string;

  @Prop({ trim: true, maxlength: 2000 })
  refundPolicy?: string;

  @Prop({ trim: true, maxlength: 2000 })
  instructions?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;
}

export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({ status: 1, startAt: 1 });
EventSchema.index({ category: 1 });
