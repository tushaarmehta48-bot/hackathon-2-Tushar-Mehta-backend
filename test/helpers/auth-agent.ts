import { INestApplication } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { UserRole } from '../../src/users/enums/user-role.enum.js';
import { UserStatus } from '../../src/users/enums/user-status.enum.js';
import { User, UserDocument } from '../../src/users/schemas/user.schema.js';

export async function createAdminUser(userModel: Model<UserDocument>) {
  const passwordHash = await hash('password123', 12);
  return userModel.create({
    name: 'Admin',
    email: 'admin-b2@example.com',
    passwordHash,
    role: UserRole.Admin,
    status: UserStatus.Active,
  });
}

export async function loginAsAdmin(app: INestApplication<App>) {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/v1/auth/login')
    .send({
      email: 'admin-b2@example.com',
      password: 'password123',
      intendedRole: 'admin',
    })
    .expect(200);
  return agent;
}
