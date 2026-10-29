import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AgentSessionDocument = HydratedDocument<AgentSession>;

@Schema({ timestamps: true })
export class AgentSession {
  @Prop({ required: true, unique: true, index: true })
  token!: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId!: Types.ObjectId;

  @Prop({ required: true, type: Date })
  expiresAt!: Date;
}

export const AgentSessionSchema = SchemaFactory.createForClass(AgentSession);

AgentSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
