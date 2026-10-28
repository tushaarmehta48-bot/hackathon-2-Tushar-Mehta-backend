import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TicketPackageDocument = HydratedDocument<TicketPackage> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true, collection: 'ticketPackages' })
export class TicketPackage {
  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  eventId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  name!: string;

  @Prop({ trim: true, maxlength: 2000 })
  description?: string;

  @Prop({ required: true, min: 0 })
  priceMinor!: number;

  @Prop({ required: true, min: 1 })
  admissionCount!: number;

  @Prop({ required: true, min: 0 })
  quantityTotal!: number;

  @Prop({ required: true, min: 0, default: 0 })
  quantitySold!: number;

  @Prop()
  saleStart?: Date;

  @Prop()
  saleEnd?: Date;

  @Prop({ min: 1 })
  perUserLimit?: number;

  @Prop({ required: true, default: true })
  active!: boolean;
}

export const TicketPackageSchema = SchemaFactory.createForClass(TicketPackage);

TicketPackageSchema.index({ eventId: 1, active: 1 });
