import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { AppModule as AppModuleType } from '../src/app.module.js';
import {
  TicketPackage,
  TicketPackageDocument,
} from '../src/events/schemas/ticket-package.schema.js';
import { User, UserDocument } from '../src/users/schemas/user.schema.js';
import {
  createAdminUser,
  loginAsAdmin,
  registerAttendee,
} from './helpers/auth-agent.js';
import {
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/create-test-app.js';

const sampleEvent = {
  title: 'Booking Concert',
  description: 'Booking e2e',
  category: 'concert',
  venue: 'Hall',
  address: '2 Road',
  startAt: new Date('2026-12-01T09:00:00.000Z').toISOString(),
  endAt: new Date('2026-12-01T18:00:00.000Z').toISOString(),
  timezone: 'Asia/Kolkata',
  capacity: 100,
  perUserTicketLimit: 10,
};

describe('Bookings (e2e)', () => {
  let app: INestApplication<App>;
  let AppModule: typeof AppModuleType;
  let userModel: Model<UserDocument>;
  let packageModel: Model<TicketPackageDocument>;

  beforeAll(async () => {
    ({ AppModule } = await import('../src/app.module.js'));
  });

  beforeEach(async () => {
    app = await createTestApp(AppModule);
    userModel = app.get(getModelToken(User.name));
    packageModel = app.get(getModelToken(TicketPackage.name));
    await createAdminUser(userModel);
  });

  afterEach(async () => {
    if (app) {
      await resetDatabase(app);
      await closeTestApp(app);
    }
  });

  async function publishEvent(quantityTotal: number) {
    const admin = await loginAsAdmin(app);
    const eventRes = await admin
      .post('/api/v1/admin/events')
      .send(sampleEvent)
      .expect(201);
    const eventId = eventRes.body.event.id as string;

    const pkgRes = await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'Standard',
        priceMinor: 15000,
        admissionCount: 1,
        quantityTotal,
      })
      .expect(201);

    await admin
      .patch(`/api/v1/admin/events/${eventId}/status`)
      .send({ status: 'published' })
      .expect(200);

    return {
      eventId,
      packageId: pkgRes.body.package.id as string,
    };
  }

  it('forbids admin and gatekeeper from booking endpoints', async () => {
    const { eventId, packageId } = await publishEvent(10);
    const admin = await loginAsAdmin(app);
    const body = {
      eventId,
      items: [{ packageId, quantity: 1 }],
    };

    await admin.post('/api/v1/bookings/quote').send(body).expect(403);
    await admin.post('/api/v1/bookings').send(body).expect(403);
    await admin.get('/api/v1/bookings/me').expect(403);
  });

  it('quotes, books, and returns tickets with unique QR tokens', async () => {
    const { eventId, packageId } = await publishEvent(20);
    const attendee = await registerAttendee(app, 'booker@example.com');

    const quote = await attendee
      .post('/api/v1/bookings/quote')
      .send({
        eventId,
        items: [{ packageId, quantity: 2 }],
      })
      .expect(200);

    expect(quote.body.quote.totalMinor).toBe(30000);

    const book = await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId, quantity: 2 }],
      })
      .expect(201);

    expect(book.body.tickets).toHaveLength(1);
    expect(book.body.tickets[0].admissionsTotal).toBe(2);
    const tokens = new Set(book.body.tickets.map((t: { qrToken: string }) => t.qrToken));
    expect(tokens.size).toBe(1);

    const me = await attendee.get('/api/v1/bookings/me').expect(200);
    expect(me.body.bookings).toHaveLength(1);

    const tickets = await attendee
      .get(`/api/v1/bookings/${book.body.booking.id}/tickets`)
      .expect(200);
    expect(tickets.body.tickets).toHaveLength(1);
    expect(tickets.body.tickets[0].admissionsTotal).toBe(2);
  });

  it('enforces per-user event ticket limit', async () => {
    const { eventId, packageId } = await publishEvent(50);
    const attendee = await registerAttendee(app, 'limit@example.com');

    await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId, quantity: 8 }],
      })
      .expect(201);

    await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId, quantity: 3 }],
      })
      .expect(400);
  });

  it('cancel restores inventory', async () => {
    const { eventId, packageId } = await publishEvent(10);
    const attendee = await registerAttendee(app, 'cancel@example.com');

    const book = await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId, quantity: 4 }],
      })
      .expect(201);

    await attendee
      .post(`/api/v1/bookings/${book.body.booking.id}/cancel`)
      .expect(200);

    const pkg = await packageModel.findById(packageId);
    expect(pkg?.quantitySold).toBe(0);
  });

  it('does not oversell under concurrent bookings', async () => {
    const { eventId, packageId } = await publishEvent(5);

    const agents = [];
    for (let i = 0; i < 10; i += 1) {
      agents.push(await registerAttendee(app, `race-${i}@example.com`));
    }

    const results = await Promise.allSettled(
      agents.map((agent) =>
        agent.post('/api/v1/bookings').send({
          eventId,
          items: [{ packageId, quantity: 1 }],
        }),
      ),
    );

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && r.value.status === 201,
    );
    const failed = results.filter(
      (r) =>
        r.status === 'fulfilled' &&
        (r.value.status === 409 || r.value.status === 400),
    );

    expect(succeeded).toHaveLength(5);
    expect(failed.length).toBeGreaterThanOrEqual(4);

    const pkg = await packageModel.findById(packageId);
    expect(pkg?.quantitySold).toBe(5);
  }, 30_000);
});
