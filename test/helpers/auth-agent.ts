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

export async function createGatekeeperUser(
  userModel: Model<UserDocument>,
  email = 'gatekeeper@example.com',
) {
  const passwordHash = await hash('password123', 12);
  return userModel.create({
    name: 'Gate Staff',
    email,
    passwordHash,
    role: UserRole.Gatekeeper,
    status: UserStatus.Active,
  });
}

export async function registerAttendee(
  app: INestApplication<App>,
  email: string,
  password = 'password123',
  name = 'Attendee',
) {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/v1/auth/register')
    .send({ name, email, password })
    .expect(201);
  await agent
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return agent;
}

export async function loginAsGatekeeper(
  app: INestApplication<App>,
  email = 'gatekeeper@example.com',
) {
  const agent = request.agent(app.getHttpServer());
  await agent
    .post('/api/v1/auth/login')
    .send({
      email,
      password: 'password123',
      intendedRole: 'gatekeeper',
    })
    .expect(200);
  return agent;
}
