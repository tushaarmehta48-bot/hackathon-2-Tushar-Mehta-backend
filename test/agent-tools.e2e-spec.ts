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

const WEBHOOK_SECRET = 'test-agent-webhook-secret-minimum-32-characters';
const sampleEvent = {
  title: 'Agent Tool Fest',
  description: 'Webhook booking test',
  category: 'demo',
  venue: 'Hall',
  address: '1 Agent Rd',
  startAt: new Date('2026-12-01T09:00:00.000Z').toISOString(),
  endAt: new Date('2026-12-01T18:00:00.000Z').toISOString(),
  timezone: 'Asia/Kolkata',
  capacity: 100,
};

describe('Agent tools (e2e)', () => {
  let app: INestApplication<App>;
  let AppModule: typeof AppModuleType;

  beforeAll(async () => {
    process.env.EVENTPULSE_AGENT_WEBHOOK_SECRET = WEBHOOK_SECRET;
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

  it('lists events and completes booking via webhook tools', async () => {
    const admin = await loginAsAdmin(app);
    const eventRes = await admin.post('/api/v1/admin/events').send(sampleEvent).expect(201);
    const eventId = eventRes.body.event.id as string;

    const pkgRes = await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'GA',
        priceMinor: 50000,
        admissionCount: 1,
        quantityTotal: 10,
      })
      .expect(201);
    const packageId = pkgRes.body.package.id as string;

    await admin
      .patch(`/api/v1/admin/events/${eventId}/status`)
      .send({ status: 'published' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Voice Guest',
        email: 'voice@example.com',
        password: 'password123',
      })
      .expect(201);

    const agent = (path: string) =>
      request(app.getHttpServer())
        .post(path)
        .set('X-EventPulse-Agent-Secret', WEBHOOK_SECRET);

    const list = await agent('/api/v1/agent/tools/list-events').send({}).expect(200);
    expect(list.body.data.events).toHaveLength(1);

    const signIn = await agent('/api/v1/agent/tools/sign-in-attendee')
      .send({ email: 'voice@example.com', password: 'password123' })
      .expect(200);
    const token = signIn.body.data.agentSessionToken as string;
    expect(token).toBeTruthy();

    const quote = await agent('/api/v1/agent/tools/quote-booking')
      .send({
        agentSessionToken: token,
        eventId,
        packageId,
        quantity: 2,
      })
      .expect(200);
    expect(quote.body.data.totalMinor).toBe(100_000);

    const book = await agent('/api/v1/agent/tools/create-booking')
      .send({
        agentSessionToken: token,
        eventId,
        packageId,
        quantity: 2,
        userConfirmed: true,
      })
      .expect(200);
    expect(book.body.data.booking.reference).toBeTruthy();
  });

  it('rejects requests without webhook secret', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/agent/tools/list-events')
      .send({})
      .expect(401);
  });
});
