import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog> & {
  createdAt: Date;
};

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'auditLogs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId!: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 120 })
  action!: string;

  @Prop({ required: true, trim: true, maxlength: 64 })
  targetType!: string;

  @Prop({ type: Types.ObjectId, required: true })
  targetId!: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
