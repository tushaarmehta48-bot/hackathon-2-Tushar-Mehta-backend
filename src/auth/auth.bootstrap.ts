import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';

@Injectable()
export class AuthBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AuthBootstrapService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('bootstrapAdmin.email');
    const password = this.config.get<string>('bootstrapAdmin.password');

    if (!email || !password) {
      return;
    }

    const created = await this.authService.ensureBootstrapAdmin(email, password);
    if (created) {
      this.logger.log(`Bootstrap admin created for ${email}`);
    }
  }
}
