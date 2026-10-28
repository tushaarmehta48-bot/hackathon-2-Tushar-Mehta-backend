import { ConflictException, ForbiddenException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../users/users.service.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  beforeEach(() => {
    usersService = {
      findByEmail: vi.fn(),
      findByEmailWithPassword: vi.fn(),
      createAttendee: vi.fn(),
      toSafeUser: vi.fn((doc) => ({
        id: '1',
        email: doc.email,
        name: doc.name,
        role: doc.role,
        status: doc.status,
      })),
    } as unknown as UsersService;

    service = new AuthService(usersService);
  });

  it('throws when registering duplicate email', async () => {
    vi.mocked(usersService.findByEmail).mockResolvedValue({} as never);
    await expect(
      service.register({
        name: 'A',
        email: 'a@b.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks login when intendedRole does not match', async () => {
    const passwordHash = await hash('password123', 12);
    vi.mocked(usersService.findByEmailWithPassword).mockResolvedValue({
      email: 'a@b.com',
      name: 'A',
      role: UserRole.Attendee,
      status: UserStatus.Active,
      passwordHash,
    } as never);

    await expect(
      service.login({
        email: 'a@b.com',
        password: 'password123',
        intendedRole: UserRole.Admin,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
