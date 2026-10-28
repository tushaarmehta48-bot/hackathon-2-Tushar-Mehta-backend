import { Module } from '@nestjs/common';
import { AuthAdminProbeController } from './auth-admin.probe.controller.js';
import { AuthBootstrapService } from './auth.bootstrap.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RolesGuard } from './guards/roles.guard.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController, AuthAdminProbeController],
  providers: [AuthService, AuthBootstrapService, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
