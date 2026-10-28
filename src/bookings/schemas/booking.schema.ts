import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  BOOKING_STATUSES,
  BookingStatus,
  type BookingStatus as BookingStatusType,
} from '../enums/booking-status.enum.js';

export type BookingItemSnapshot = {
  packageId: Types.ObjectId;
  packageName: string;
  priceMinor: number;
  admissionCount: number;
  quantity: number;
  lineTotalMinor: number;
};

export type BookingDocument = HydratedDocument<Booking> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true, collection: 'bookings' })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId!: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true })
  reference!: string;

  @Prop({
    type: [
      {
        packageId: { type: Types.ObjectId, required: true },
        packageName: { type: String, required: true },
        priceMinor: { type: Number, required: true },
        admissionCount: { type: Number, required: true },
        quantity: { type: Number, required: true },
        lineTotalMinor: { type: Number, required: true },
      },
    ],
    required: true,
  })
  items!: BookingItemSnapshot[];

  @Prop({ required: true, min: 0 })
  totalMinor!: number;

  @Prop({
    type: String,
    required: true,
    enum: BOOKING_STATUSES,
    default: BookingStatus.Confirmed,
  })
  status!: BookingStatusType;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index({ userId: 1, eventId: 1 });
