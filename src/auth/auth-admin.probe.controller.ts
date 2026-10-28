import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum.js';
import { Roles } from './decorators/roles.decorator.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

/** Minimal protected route for e2e role-guard verification (removed or expanded in B2). */
@Controller('auth')
export class AuthAdminProbeController {
  @Get('admin-probe')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  adminProbe() {
    return { ok: true };
  }
}
