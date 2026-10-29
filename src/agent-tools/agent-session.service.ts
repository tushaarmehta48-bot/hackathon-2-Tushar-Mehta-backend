import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'node:crypto';
import { Model, Types } from 'mongoose';
import {
  AgentSession,
  type AgentSessionDocument,
} from './schemas/agent-session.schema.js';

const SESSION_TTL_MS = 45 * 60 * 1000;

@Injectable()
export class AgentSessionService {
  constructor(
    @InjectModel(AgentSession.name)
    private readonly sessionModel: Model<AgentSessionDocument>,
  ) {}

  async createForUser(userId: string): Promise<string> {
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.sessionModel.create({
      token,
      userId: new Types.ObjectId(userId),
      expiresAt,
    });
    return token;
  }

  async resolveUserId(token: string): Promise<string> {
    const row = await this.sessionModel.findOne({ token }).exec();
    if (!row || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(
        'Session expired or invalid. Ask the guest to sign in again with sign_in_attendee.',
      );
    }
    return row.userId.toString();
  }
}
