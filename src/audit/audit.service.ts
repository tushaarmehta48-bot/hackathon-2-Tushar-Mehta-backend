import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema.js';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
  ) {}

  async log(params: {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.auditModel.create({
      actorId: new Types.ObjectId(params.actorId),
      action: params.action,
      targetType: params.targetType,
      targetId: new Types.ObjectId(params.targetId),
      metadata: params.metadata,
    });
  }
}
