import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { SafeUser } from '../../common/types/session.types.js';
import { UserStatus } from '../../users/enums/user-status.enum.js';
import { UsersService } from '../../users/users.service.js';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: SafeUser }>();
    const userId = request.session?.userId;

    if (!userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.usersService.findById(userId);
    if (!user || user.status !== UserStatus.Active) {
      throw new UnauthorizedException('Not authenticated');
    }

    request.user = this.usersService.toSafeUser(user);
    return true;
  }
}
