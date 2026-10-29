import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { hash } from 'bcryptjs';
import type { Connection } from 'mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { AppModule as AppModuleType } from '../src/app.module.js';
import { UserRole } from '../src/users/enums/user-role.enum.js';
import { UserStatus } from '../src/users/enums/user-status.enum.js';
import { User, UserDocument } from '../src/users/schemas/user.schema.js';
import {
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/create-test-app.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let AppModule: typeof AppModuleType;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    ({ AppModule } = await import('../src/app.module.js'));
  });

  beforeEach(async () => {
    app = await createTestApp(AppModule);
    userModel = app.get(getModelToken(User.name));
  });

  afterEach(async () => {
    if (app) {
      await resetDatabase(app);
      await closeTestApp(app);
    }
  });

  it('registers attendee without session until login', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/register')
      .send({
        name: 'Alex Attendee',
        email: 'alex@example.com',
        password: 'password123',
      })
      .expect(201);

    await agent.get('/api/v1/users/me').expect(401);

    await agent
      .post('/api/v1/auth/login')
      .send({ email: 'alex@example.com', password: 'password123' })
      .expect(200);

    const me = await agent.get('/api/v1/users/me').expect(200);
    expect(me.body.user.email).toBe('alex@example.com');
    expect(me.body.user.role).toBe('attendee');
    expect(me.body.user).not.toHaveProperty('passwordHash');
  });

  it('logs in and logs out', async () => {
    const passwordHash = await hash('password123', 12);
    await userModel.create({
      name: 'Login User',
      email: 'login@example.com',
      passwordHash,
      role: UserRole.Attendee,
      status: UserStatus.Active,
    });

    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'password123' })
      .expect(200);

    await agent.get('/api/v1/users/me').expect(200);

    await agent.post('/api/v1/auth/logout').expect(200);
    await agent.get('/api/v1/users/me').expect(401);
  });

  it('rejects admin portal login for attendee', async () => {
    const passwordHash = await hash('password123', 12);
    await userModel.create({
      name: 'Attendee Only',
      email: 'att@example.com',
      passwordHash,
      role: UserRole.Attendee,
      status: UserStatus.Active,
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'att@example.com',
        password: 'password123',
        intendedRole: 'admin',
      })
      .expect(403);
  });

  it('allows admin probe only for admin role', async () => {
    const passwordHash = await hash('password123', 12);
    await userModel.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash,
      role: UserRole.Admin,
      status: UserStatus.Active,
    });

    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123',
        intendedRole: 'admin',
      })
      .expect(200);

    await agent.get('/api/v1/auth/admin-probe').expect(200);
  });

  it('rejects unauthenticated /users/me', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
  });
});
