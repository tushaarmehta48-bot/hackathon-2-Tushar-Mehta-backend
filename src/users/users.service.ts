import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { SafeUser } from '../common/types/session.types.js';
import { UserRole } from './enums/user-role.enum.js';
import { UserStatus } from './enums/user-status.enum.js';
import { User, UserDocument } from './schemas/user.schema.js';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  toSafeUser(doc: UserDocument): SafeUser {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      role: doc.role,
      status: doc.status,
    };
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  findByEmailWithPassword(email: string) {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .exec();
  }

  findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async createAttendee(name: string, email: string, passwordHash: string) {
    const user = new this.userModel({
      name,
      email,
      passwordHash,
      role: UserRole.Attendee,
      status: UserStatus.Active,
    });
    return user.save();
  }

  async createAdminIfMissing(name: string, email: string, passwordHash: string) {
    const existing = await this.findByEmail(email);
    if (existing) {
      return null;
    }
    const user = new this.userModel({
      name,
      email,
      passwordHash,
      role: UserRole.Admin,
      status: UserStatus.Active,
    });
    return user.save();
  }
}
