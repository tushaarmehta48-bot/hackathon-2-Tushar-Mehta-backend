import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service.js';
import { Event, EventDocument } from '../events/schemas/event.schema.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import type { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { AssignmentStatus } from './enums/assignment-status.enum.js';
import {
  GatekeeperAssignment,
  GatekeeperAssignmentDocument,
} from './schemas/gatekeeper-assignment.schema.js';

@Injectable()
export class GatekeeperAssignmentsService {
  constructor(
    @InjectModel(GatekeeperAssignment.name)
    private readonly assignmentModel: Model<GatekeeperAssignmentDocument>,
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  async createAssignment(
    gatekeeperId: string,
    dto: CreateAssignmentDto,
    actorId: string,
  ) {
    if (!Types.ObjectId.isValid(gatekeeperId) || !Types.ObjectId.isValid(dto.eventId)) {
      throw new NotFoundException('Gatekeeper or event not found');
    }

    const gatekeeper = await this.usersService.findById(gatekeeperId);
    if (!gatekeeper || gatekeeper.role !== UserRole.Gatekeeper) {
      throw new NotFoundException('Gatekeeper not found');
    }

    const event = await this.eventModel.findById(dto.eventId).exec();
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (dto.startsAt && dto.endsAt && dto.endsAt <= dto.startsAt) {
      throw new ConflictException('endsAt must be after startsAt');
    }

    const assignment = await this.assignmentModel.create({
      gatekeeperId: gatekeeper._id,
      eventId: event._id,
      gateId: dto.gateId?.trim(),
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      status: AssignmentStatus.Active,
    });

    await this.auditService.log({
      actorId,
      action: 'gatekeeper.assign',
      targetType: 'gatekeeperAssignment',
      targetId: assignment._id.toString(),
      metadata: { gatekeeperId, eventId: dto.eventId },
    });

    return assignment;
  }

  async listForGatekeeper(gatekeeperId: string) {
    if (!Types.ObjectId.isValid(gatekeeperId)) {
      return [];
    }

    const now = new Date();
    const rows = await this.assignmentModel
      .find({
        gatekeeperId: new Types.ObjectId(gatekeeperId),
        status: AssignmentStatus.Active,
      })
      .populate('eventId', 'title venue startAt endAt status')
      .exec();

    return rows.filter((row) => this.isWithinWindow(row, now));
  }

  async hasActiveAssignment(
    gatekeeperId: string,
    eventId: Types.ObjectId,
    gateId?: string,
  ) {
    const assignment = await this.assignmentModel
      .findOne({
        gatekeeperId: new Types.ObjectId(gatekeeperId),
        eventId,
        status: AssignmentStatus.Active,
      })
      .exec();

    if (!assignment || !this.isWithinWindow(assignment, new Date())) {
      return false;
    }

    if (assignment.gateId && gateId && assignment.gateId !== gateId) {
      return false;
    }

    return true;
  }

  private isWithinWindow(
    assignment: GatekeeperAssignmentDocument,
    now: Date,
  ) {
    if (assignment.startsAt && now < assignment.startsAt) {
      return false;
    }
    if (assignment.endsAt && now > assignment.endsAt) {
      return false;
    }
    return true;
  }

  toAssignmentResponse(row: GatekeeperAssignmentDocument) {
    const eventRef = row.eventId as unknown as
      | Types.ObjectId
      | (EventDocument & { _id: Types.ObjectId });
    const eventDoc =
      typeof eventRef === 'object' &&
      eventRef !== null &&
      '_id' in eventRef &&
      'title' in eventRef
        ? eventRef
        : null;
    const eventId =
      eventDoc?._id.toString() ??
      (row.eventId as Types.ObjectId).toString();

    return {
      id: row._id.toString(),
      eventId,
      gateId: row.gateId,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      event: eventDoc
        ? {
            id: eventDoc._id.toString(),
            title: eventDoc.title,
            venue: eventDoc.venue,
            startAt: eventDoc.startAt,
            endAt: eventDoc.endAt,
            status: eventDoc.status,
          }
        : undefined,
    };
  }
}
