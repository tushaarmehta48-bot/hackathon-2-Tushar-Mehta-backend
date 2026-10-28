import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { SafeUser } from '../common/types/session.types.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { UpdateEventStatusDto } from './dto/update-event-status.dto.js';
import { toAdminEvent } from './events.mapper.js';
import { EventsService } from './events.service.js';

@Controller('admin/events')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async create(@Body() dto: CreateEventDto, @CurrentUser() user: SafeUser) {
    const event = await this.eventsService.create(dto, user.id);
    return { event: toAdminEvent(event) };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: SafeUser,
  ) {
    const event = await this.eventsService.update(id, dto, user.id);
    return { event: toAdminEvent(event) };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
    @CurrentUser() user: SafeUser,
  ) {
    const event = await this.eventsService.updateStatus(
      id,
      dto.status,
      user.id,
    );
    return { event: toAdminEvent(event) };
  }
}
