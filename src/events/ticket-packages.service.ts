import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service.js';
import type { CreatePackageDto } from './dto/create-package.dto.js';
import type { UpdatePackageDto } from './dto/update-package.dto.js';
import { Event, EventDocument } from './schemas/event.schema.js';
import {
  TicketPackage,
  TicketPackageDocument,
} from './schemas/ticket-package.schema.js';

@Injectable()
export class TicketPackagesService {
  constructor(
    @InjectModel(TicketPackage.name)
    private readonly packageModel: Model<TicketPackageDocument>,
    @InjectModel(Event.name)
    private readonly eventModel: Model<EventDocument>,
    private readonly auditService: AuditService,
  ) {}

  private validatePackageDates(dto: {
    saleStart?: Date;
    saleEnd?: Date;
  }) {
    if (dto.saleStart && dto.saleEnd && dto.saleEnd <= dto.saleStart) {
      throw new BadRequestException('saleEnd must be after saleStart');
    }
  }

  private validateQuantitySold(pkg: TicketPackageDocument, quantityTotal: number) {
    if (quantityTotal < pkg.quantitySold) {
      throw new BadRequestException(
        `quantityTotal cannot be less than quantitySold (${pkg.quantitySold})`,
      );
    }
  }

  async createForEvent(
    eventId: string,
    dto: CreatePackageDto,
    actorId: string,
  ) {
    if (!Types.ObjectId.isValid(eventId)) {
      throw new NotFoundException('Event not found');
    }

    const event = await this.eventModel.findById(eventId).exec();
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    this.validatePackageDates(dto);

    const pkg = await this.packageModel.create({
      eventId: event._id,
      name: dto.name.trim(),
      description: dto.description?.trim(),
      priceMinor: dto.priceMinor,
      admissionCount: dto.admissionCount,
      quantityTotal: dto.quantityTotal,
      quantitySold: 0,
      saleStart: dto.saleStart,
      saleEnd: dto.saleEnd,
      perUserLimit: dto.perUserLimit,
      active: dto.active ?? true,
    });

    await this.auditService.log({
      actorId,
      action: 'ticket_package.create',
      targetType: 'ticketPackage',
      targetId: pkg._id.toString(),
      metadata: { eventId },
    });

    return pkg;
  }

  async update(packageId: string, dto: UpdatePackageDto, actorId: string) {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new NotFoundException('Package not found');
    }

    const pkg = await this.packageModel.findById(packageId).exec();
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    const nextDates = {
      saleStart: dto.saleStart ?? pkg.saleStart,
      saleEnd: dto.saleEnd ?? pkg.saleEnd,
    };
    this.validatePackageDates(nextDates);

    if (dto.quantityTotal !== undefined) {
      this.validateQuantitySold(pkg, dto.quantityTotal);
    }

    if (dto.name !== undefined) pkg.name = dto.name.trim();
    if (dto.description !== undefined) {
      pkg.description = dto.description?.trim();
    }
    if (dto.priceMinor !== undefined) pkg.priceMinor = dto.priceMinor;
    if (dto.admissionCount !== undefined) {
      pkg.admissionCount = dto.admissionCount;
    }
    if (dto.quantityTotal !== undefined) pkg.quantityTotal = dto.quantityTotal;
    if (dto.saleStart !== undefined) pkg.saleStart = dto.saleStart;
    if (dto.saleEnd !== undefined) pkg.saleEnd = dto.saleEnd;
    if (dto.perUserLimit !== undefined) pkg.perUserLimit = dto.perUserLimit;
    if (dto.active !== undefined) pkg.active = dto.active;

    await pkg.save();

    await this.auditService.log({
      actorId,
      action: 'ticket_package.update',
      targetType: 'ticketPackage',
      targetId: pkg._id.toString(),
      metadata: { eventId: pkg.eventId.toString() },
    });

    return pkg;
  }

  async countActiveByEvent(eventId: Types.ObjectId) {
    return this.packageModel
      .countDocuments({ eventId, active: true })
      .exec();
  }
}
