import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('session')
  @HttpCode(200)
  async session(@Req() req: Request) {
    return this.authService.getSessionForRequest(req.session?.userId);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.authService.login(dto);
    req.session.userId = user.id;
    return { user };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request) {
    const session = req.session;
    if (!session.userId) {
      return { success: true };
    }

    await new Promise<void>((resolve, reject) => {
      session.destroy((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    return { success: true };
  }
}
