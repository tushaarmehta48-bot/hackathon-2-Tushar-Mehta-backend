import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CheckInDocument = HydratedDocument<CheckIn> & {
  createdAt: Date;
};

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'checkIns' })
export class CheckIn {
  @Prop({ type: Types.ObjectId, ref: 'Ticket', required: true })
  ticketId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  gatekeeperId!: Types.ObjectId;

  @Prop({ trim: true, maxlength: 64 })
  gateId?: string;

  @Prop({ required: true, trim: true, maxlength: 32 })
  result!: string;

  @Prop({ required: true, default: () => new Date() })
  timestamp!: Date;
}

export const CheckInSchema = SchemaFactory.createForClass(CheckIn);

CheckInSchema.index({ eventId: 1, timestamp: -1 });
