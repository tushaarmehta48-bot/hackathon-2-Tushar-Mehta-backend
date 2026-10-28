import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { SafeUser } from '../common/types/session.types.js';

@Controller('users')
export class UsersController {
  @Get('me')
  @UseGuards(SessionAuthGuard)
  getMe(@CurrentUser() user: SafeUser) {
    return { user };
  }
}
