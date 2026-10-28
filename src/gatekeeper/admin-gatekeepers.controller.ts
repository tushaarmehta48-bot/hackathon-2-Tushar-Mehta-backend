import {
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { hash } from 'bcryptjs';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { SafeUser } from '../common/types/session.types.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UsersService } from '../users/users.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { CreateGatekeeperDto } from './dto/create-gatekeeper.dto.js';
import { GatekeeperAssignmentsService } from './gatekeeper-assignments.service.js';

@Controller('admin/gatekeepers')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminGatekeepersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly assignmentsService: GatekeeperAssignmentsService,
  ) {}

  @Get()
  async list() {
    const gatekeepers = await this.usersService.listByRole(UserRole.Gatekeeper);
    return {
      gatekeepers: gatekeepers.map((user) => this.usersService.toSafeUser(user)),
    };
  }

  @Post()
  async create(@Body() dto: CreateGatekeeperDto, @CurrentUser() admin: SafeUser) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hash(dto.password, 12);
    const user = await this.usersService.createGatekeeper(
      dto.name.trim(),
      dto.email,
      passwordHash,
    );

    return { user: this.usersService.toSafeUser(user) };
  }

  @Post(':gatekeeperId/assignments')
  async assign(
    @Param('gatekeeperId') gatekeeperId: string,
    @Body() dto: CreateAssignmentDto,
    @CurrentUser() admin: SafeUser,
  ) {
    const assignment = await this.assignmentsService.createAssignment(
      gatekeeperId,
      dto,
      admin.id,
    );
    return {
      assignment: this.assignmentsService.toAssignmentResponse(assignment),
    };
  }
}
