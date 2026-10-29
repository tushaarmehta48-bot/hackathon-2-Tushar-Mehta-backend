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

const endedEvent = {
  title: 'Past Workshop',
  description: 'Feedback e2e',
  category: 'workshop',
  venue: 'Room A',
  address: '5 Past St',
  startAt: new Date('2020-06-01T09:00:00.000Z').toISOString(),
  endAt: new Date('2020-06-01T17:00:00.000Z').toISOString(),
  timezone: 'Asia/Kolkata',
  capacity: 50,
};

describe('Feedback (e2e)', () => {
  let app: INestApplication<App>;
  let AppModule: typeof AppModuleType;
  let userModel: Model<UserDocument>;

  beforeAll(async () => {
    ({ AppModule } = await import('../src/app.module.js'));
  });

  beforeEach(async () => {
    app = await createTestApp(AppModule);
    userModel = app.get(getModelToken(User.name));
    await createAdminUser(userModel);
  });

  afterEach(async () => {
    if (app) {
      await resetDatabase(app);
      await closeTestApp(app);
    }
  });

  it('submits feedback after event ends and supports admin moderation', async () => {
    const admin = await loginAsAdmin(app);
    const eventRes = await admin.post('/api/v1/admin/events').send(endedEvent).expect(201);
    const eventId = eventRes.body.event.id as string;

    const pkgRes = await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'Pass',
        priceMinor: 5000,
        admissionCount: 1,
        quantityTotal: 20,
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
        name: 'Guest',
        email: 'guest-fb@example.com',
        password: 'password123',
      })
      .expect(201);

    await attendee
      .post('/api/v1/auth/login')
      .send({ email: 'guest-fb@example.com', password: 'password123' })
      .expect(200);

    const booking = await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId: pkgRes.body.package.id, quantity: 1 }],
      })
      .expect(201);

    await attendee
      .post(`/api/v1/events/${eventId}/feedback`)
      .send({
        bookingId: booking.body.booking.id,
        rating: 5,
        comment: 'Great event',
      })
      .expect(201);

    const list = await admin.get(`/api/v1/admin/feedback?eventId=${eventId}`).expect(200);
    expect(list.body.feedback).toHaveLength(1);

    const auditBefore = await admin.get('/api/v1/admin/audit-logs?targetType=event').expect(200);
    expect(auditBefore.body.auditLogs.length).toBeGreaterThan(0);

    const feedbackId = list.body.feedback[0].id as string;
    await admin
      .patch(`/api/v1/admin/feedback/${feedbackId}/moderation`)
      .send({ moderationStatus: 'hidden' })
      .expect(200);

    const hidden = await admin
      .get(`/api/v1/admin/feedback?eventId=${eventId}&moderationStatus=hidden`)
      .expect(200);
    expect(hidden.body.feedback).toHaveLength(1);
  });

  it('blocks feedback before event ends', async () => {
    const admin = await loginAsAdmin(app);
    const futureEvent = {
      ...endedEvent,
      startAt: new Date('2030-06-01T09:00:00.000Z').toISOString(),
      endAt: new Date('2030-06-01T17:00:00.000Z').toISOString(),
    };
    const eventRes = await admin.post('/api/v1/admin/events').send(futureEvent).expect(201);
    const eventId = eventRes.body.event.id as string;

    const pkgRes = await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'Pass',
        priceMinor: 5000,
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
        name: 'Guest2',
        email: 'guest2-fb@example.com',
        password: 'password123',
      })
      .expect(201);

    await attendee
      .post('/api/v1/auth/login')
      .send({ email: 'guest2-fb@example.com', password: 'password123' })
      .expect(200);

    const booking = await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId: pkgRes.body.package.id, quantity: 1 }],
      })
      .expect(201);

    await attendee
      .post(`/api/v1/events/${eventId}/feedback`)
      .send({
        bookingId: booking.body.booking.id,
        rating: 4,
      })
      .expect(400);
  });
});
