import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { SafeUser } from '../../common/types/session.types.js';
import type { UserRole } from '../../users/enums/user-role.enum.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: SafeUser }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
