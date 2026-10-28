import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { AppModule as AppModuleType } from '../src/app.module.js';
import { User, UserDocument } from '../src/users/schemas/user.schema.js';
import { createAdminUser, loginAsAdmin } from './helpers/auth-agent.js';
import {
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/create-test-app.js';

const sampleEvent = {
  title: 'Assistant Demo',
  description: 'Assistant e2e',
  category: 'demo',
  venue: 'Hall',
  address: '1 AI Rd',
  startAt: new Date('2026-12-01T09:00:00.000Z').toISOString(),
  endAt: new Date('2026-12-01T18:00:00.000Z').toISOString(),
  timezone: 'Asia/Kolkata',
  capacity: 100,
};

describe('Assistant (e2e)', () => {
  let app: INestApplication<App>;
  let AppModule: typeof AppModuleType;

  beforeAll(async () => {
    ({ AppModule } = await import('../src/app.module.js'));
  });

  beforeEach(async () => {
    app = await createTestApp(AppModule);
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    await createAdminUser(userModel);
  });

  afterEach(async () => {
    if (app) {
      await resetDatabase(app);
      await closeTestApp(app);
    }
  });

  it('returns real events on turn without inventing data', async () => {
    const admin = await loginAsAdmin(app);
    const eventRes = await admin.post('/api/v1/admin/events').send(sampleEvent).expect(201);
    const eventId = eventRes.body.event.id as string;

    await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'Standard',
        priceMinor: 9999,
        admissionCount: 1,
        quantityTotal: 5,
      })
      .expect(201);

    await admin
      .patch(`/api/v1/admin/events/${eventId}/status`)
      .send({ status: 'published' })
      .expect(200);

    const attendee = request.agent(app.getHttpServer());
    await attendee
      .post('/api/v1/auth/register')
      .send({
        name: 'Assist User',
        email: 'assist@example.com',
        password: 'password123',
      })
      .expect(201);

    const turn = await attendee
      .post('/api/v1/assistant/turn')
      .send({ state: 'idle', message: 'show events', locale: 'en' })
      .expect(201);

    expect(turn.body.turn.templateKey).toBe('assistant.events.list');
    expect(turn.body.turn.data.events).toHaveLength(1);
    expect(turn.body.turn.data.events[0].id).toBe(eventId);
  });
});
