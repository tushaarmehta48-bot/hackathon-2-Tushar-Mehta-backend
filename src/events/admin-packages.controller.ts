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
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { toPackage } from './events.mapper.js';
import { TicketPackagesService } from './ticket-packages.service.js';

@Controller('admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminPackagesController {
  constructor(private readonly packagesService: TicketPackagesService) {}

  @Post('events/:eventId/packages')
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreatePackageDto,
    @CurrentUser() user: SafeUser,
  ) {
    const pkg = await this.packagesService.createForEvent(
      eventId,
      dto,
      user.id,
    );
    return { package: toPackage(pkg) };
  }

  @Patch('packages/:packageId')
  async update(
    @Param('packageId') packageId: string,
    @Body() dto: UpdatePackageDto,
    @CurrentUser() user: SafeUser,
  ) {
    const pkg = await this.packagesService.update(packageId, dto, user.id);
    return { package: toPackage(pkg) };
  }
}
