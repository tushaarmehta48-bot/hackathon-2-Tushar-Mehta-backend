import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  MODERATION_STATUSES,
  ModerationStatus,
  type ModerationStatus as ModerationStatusType,
} from '../enums/moderation-status.enum.js';

export type FeedbackDocument = HydratedDocument<Feedback> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true, collection: 'feedback' })
export class Feedback {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, unique: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId!: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ trim: true, maxlength: 2000 })
  comment?: string;

  @Prop({
    type: String,
    required: true,
    enum: MODERATION_STATUSES,
    default: ModerationStatus.Visible,
  })
  moderationStatus!: ModerationStatusType;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

FeedbackSchema.index({ eventId: 1, moderationStatus: 1 });
