import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { AdminReportsService } from './admin-reports.service.js';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto.js';
import { AdminCheckInsQueryDto } from './dto/admin-check-ins-query.dto.js';

@Controller('admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('analytics')
  getAnalytics(@Query() query: AdminAnalyticsQueryDto) {
    return this.reportsService.getAnalytics(query);
  }

  @Get('check-ins')
  listCheckIns(@Query() query: AdminCheckInsQueryDto) {
    return this.reportsService.listCheckIns(query);
  }
}
