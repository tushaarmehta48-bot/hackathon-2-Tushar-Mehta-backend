import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  USER_ROLES,
  UserRole,
  type UserRole as UserRoleType,
} from '../enums/user-role.enum.js';
import {
  USER_STATUSES,
  UserStatus,
  type UserStatus as UserStatusType,
} from '../enums/user-status.enum.js';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({
    type: String,
    required: true,
    enum: USER_ROLES,
    default: UserRole.Attendee,
  })
  role!: UserRoleType;

  @Prop({
    type: String,
    required: true,
    enum: USER_STATUSES,
    default: UserStatus.Active,
  })
  status!: UserStatusType;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ role: 1 });
