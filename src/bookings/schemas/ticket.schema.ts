import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  TICKET_STATUSES,
  TicketStatus,
  type TicketStatus as TicketStatusType,
} from '../enums/ticket-status.enum.js';

export type TicketDocument = HydratedDocument<Ticket> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true, collection: 'tickets' })
export class Ticket {
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true, index: true })
  bookingId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  packageId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  ticketCode!: string;

  @Prop({ required: true, unique: true })
  qrToken!: string;

  @Prop({
    type: String,
    required: true,
    enum: TICKET_STATUSES,
    default: TicketStatus.Valid,
  })
  status!: TicketStatusType;

  @Prop()
  checkedInAt?: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.index({ eventId: 1, status: 1 });
