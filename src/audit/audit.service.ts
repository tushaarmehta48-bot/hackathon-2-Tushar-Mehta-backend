import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema.js';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto.js';

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

  async list(query: AuditLogQueryDto) {
    const filter: {
      actorId?: Types.ObjectId;
      targetType?: string;
      targetId?: Types.ObjectId;
      createdAt?: { $gte?: Date; $lte?: Date };
    } = {};

    if (query.actorId && Types.ObjectId.isValid(query.actorId)) {
      filter.actorId = new Types.ObjectId(query.actorId);
    }
    if (query.targetType) {
      filter.targetType = query.targetType;
    }
    if (query.targetId && Types.ObjectId.isValid(query.targetId)) {
      filter.targetId = new Types.ObjectId(query.targetId);
    }
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = query.from;
      if (query.to) filter.createdAt.$lte = query.to;
    }

    const rows = await this.auditModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .exec();

    return {
      auditLogs: rows.map((row) => ({
        id: row._id.toString(),
        actorId: row.actorId.toString(),
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId.toString(),
        metadata: row.metadata,
        createdAt: row.createdAt,
      })),
    };
  }
}
