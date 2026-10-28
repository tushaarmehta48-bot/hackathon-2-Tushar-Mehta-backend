import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  ASSIGNMENT_STATUSES,
  AssignmentStatus,
  type AssignmentStatus as AssignmentStatusType,
} from '../enums/assignment-status.enum.js';

export type GatekeeperAssignmentDocument = HydratedDocument<GatekeeperAssignment> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true, collection: 'gatekeeperAssignments' })
export class GatekeeperAssignment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  gatekeeperId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true, index: true })
  eventId!: Types.ObjectId;

  @Prop({ trim: true, maxlength: 64 })
  gateId?: string;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop({
    type: String,
    required: true,
    enum: ASSIGNMENT_STATUSES,
    default: AssignmentStatus.Active,
  })
  status!: AssignmentStatusType;
}

export const GatekeeperAssignmentSchema =
  SchemaFactory.createForClass(GatekeeperAssignment);

GatekeeperAssignmentSchema.index({ gatekeeperId: 1, eventId: 1 });
