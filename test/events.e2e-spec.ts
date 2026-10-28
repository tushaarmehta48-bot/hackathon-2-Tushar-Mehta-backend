import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { AppModule as AppModuleType } from '../src/app.module.js';
import { AuditLog, AuditLogDocument } from '../src/audit/schemas/audit-log.schema.js';
import { User, UserDocument } from '../src/users/schemas/user.schema.js';
import { createAdminUser, loginAsAdmin } from './helpers/auth-agent.js';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { closeTestApp, createTestApp } from './helpers/create-test-app.js';

const sampleEvent = {
  title: 'Campus Tech Meetup',
  description: 'A full-day meetup for builders.',
  category: 'meetup',
  bannerUrl: 'https://example.com/banner.jpg',
  venue: 'Main Hall',
  address: '123 College Road',
  startAt: new Date('2026-12-01T09:00:00.000Z').toISOString(),
  endAt: new Date('2026-12-01T18:00:00.000Z').toISOString(),
  timezone: 'Asia/Kolkata',
  capacity: 500,
  perUserTicketLimit: 4,
};

describe('Events (e2e)', () => {
  let app: INestApplication<App>;
  let AppModule: typeof AppModuleType;
  let userModel: Model<UserDocument>;
  let auditModel: Model<AuditLogDocument>;

  beforeAll(async () => {
    ({ AppModule } = await import('../src/app.module.js'));
  });

  beforeEach(async () => {
    app = await createTestApp(AppModule);
    const connection = app.get<Connection>(getConnectionToken());
    await connection.dropDatabase();
    userModel = app.get(getModelToken(User.name));
    auditModel = app.get(getModelToken(AuditLog.name));
    await createAdminUser(userModel);
  });

  afterEach(async () => {
    if (app) {
      await closeTestApp(app);
    }
  });

  it('admin draft → package → publish; public list only published', async () => {
    const admin = await loginAsAdmin(app);

    const createRes = await admin
      .post('/api/v1/admin/events')
      .send(sampleEvent)
      .expect(201);

    const eventId = createRes.body.event.id;
    expect(createRes.body.event.status).toBe('draft');

    await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .expect(404);

    await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'Single Pass',
        priceMinor: 49900,
        admissionCount: 1,
        quantityTotal: 100,
      })
      .expect(201);

    await admin
      .patch(`/api/v1/admin/events/${eventId}/status`)
      .send({ status: 'published' })
      .expect(200);

    const list = await request(app.getHttpServer())
      .get('/api/v1/events')
      .expect(200);

    expect(list.body.events).toHaveLength(1);
    expect(list.body.events[0].id).toBe(eventId);

    const auditCount = await auditModel.countDocuments({
      targetType: 'event',
      targetId: new Types.ObjectId(eventId),
    });
    expect(auditCount).toBeGreaterThanOrEqual(2);
  });

  it('blocks attendee from admin event create', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/v1/auth/register')
      .send({
        name: 'Attendee',
        email: 'att-b2@example.com',
        password: 'password123',
      })
      .expect(201);

    await agent.post('/api/v1/admin/events').send(sampleEvent).expect(403);
  });

  it('requires package before publish', async () => {
    const admin = await loginAsAdmin(app);
    const createRes = await admin
      .post('/api/v1/admin/events')
      .send(sampleEvent)
      .expect(201);

    await admin
      .patch(`/api/v1/admin/events/${createRes.body.event.id}/status`)
      .send({ status: 'published' })
      .expect(400);
  });
});
