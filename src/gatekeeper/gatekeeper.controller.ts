import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { SafeUser } from '../common/types/session.types.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { CheckInService } from './check-in.service.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { GatekeeperAssignmentsService } from './gatekeeper-assignments.service.js';

@Controller('gatekeeper')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Gatekeeper)
export class GatekeeperController {
  constructor(
    private readonly assignmentsService: GatekeeperAssignmentsService,
    private readonly checkInService: CheckInService,
  ) {}

  @Get('assignments')
  async assignments(@CurrentUser() user: SafeUser) {
    const rows = await this.assignmentsService.listForGatekeeper(user.id);
    return {
      assignments: rows.map((row) =>
        this.assignmentsService.toAssignmentResponse(row),
      ),
    };
  }

  @Post('check-in')
  async checkIn(@Body() dto: CheckInDto, @CurrentUser() user: SafeUser) {
    return this.checkInService.checkIn(user.id, dto);
  }
}
