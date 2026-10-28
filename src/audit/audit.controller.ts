import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { AuditService } from './audit.service.js';
import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';

@Controller('admin/audit-logs')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: AuditLogQueryDto) {
    return this.auditService.list(query);
  }
}
