import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.createAttendee(
      dto.name.trim(),
      dto.email,
      passwordHash,
    );

    return this.usersService.toSafeUser(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.Active) {
      throw new UnauthorizedException('Account is disabled');
    }

    const valid = await compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (dto.intendedRole && user.role !== dto.intendedRole) {
      throw new ForbiddenException('You do not have access to this portal');
    }

    return this.usersService.toSafeUser(user);
  }

  async ensureBootstrapAdmin(email: string, password: string, name = 'Platform Admin') {
    const passwordHash = await hash(password, BCRYPT_ROUNDS);
    return this.usersService.createAdminIfMissing(name, email, passwordHash);
  }
}
