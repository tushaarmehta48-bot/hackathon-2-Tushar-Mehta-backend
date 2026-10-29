import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { AppModule as AppModuleType } from '../src/app.module.js';
import { User, UserDocument } from '../src/users/schemas/user.schema.js';
import {
  createAdminUser,
  createGatekeeperUser,
  loginAsAdmin,
  loginAsGatekeeper,
} from './helpers/auth-agent.js';
import {
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/create-test-app.js';

const sampleEvent = {
  title: 'Gate Check Event',
  description: 'Check-in e2e',
  category: 'meetup',
  venue: 'Hall',
  address: '3 Gate Lane',
  startAt: new Date('2026-12-01T09:00:00.000Z').toISOString(),
  endAt: new Date('2026-12-01T18:00:00.000Z').toISOString(),
  timezone: 'Asia/Kolkata',
  capacity: 100,
};

describe('Gatekeeper (e2e)', () => {
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
    await createGatekeeperUser(userModel);
  });

  afterEach(async () => {
    if (app) {
      await resetDatabase(app);
      await closeTestApp(app);
    }
  });

  async function publishEventWithTicket() {
    const admin = await loginAsAdmin(app);
    const eventRes = await admin.post('/api/v1/admin/events').send(sampleEvent).expect(201);
    const eventId = eventRes.body.event.id as string;

    const pkgRes = await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'Entry',
        priceMinor: 10000,
        admissionCount: 1,
        quantityTotal: 20,
      })
      .expect(201);

    await admin
      .patch(`/api/v1/admin/events/${eventId}/status`)
      .send({ status: 'published' })
      .expect(200);

    const gatekeeper = await userModel.findOne({ email: 'gatekeeper@example.com' });
    await admin
      .post(`/api/v1/admin/gatekeepers/${gatekeeper!._id.toString()}/assignments`)
      .send({ eventId, gateId: 'GATE-A' })
      .expect(201);

    const attendee = request.agent(app.getHttpServer());
    await attendee
      .post('/api/v1/auth/register')
      .send({
        name: 'Guest',
        email: 'guest@example.com',
        password: 'password123',
      })
      .expect(201);

    await attendee
      .post('/api/v1/auth/login')
      .send({ email: 'guest@example.com', password: 'password123' })
      .expect(200);

    const booking = await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId: pkgRes.body.package.id, quantity: 1 }],
      })
      .expect(201);

    return {
      eventId,
      qrToken: booking.body.tickets[0].qrToken as string,
    };
  }

  it('lists assignments and checks in a valid ticket', async () => {
    const { qrToken } = await publishEventWithTicket();
    const staff = await loginAsGatekeeper(app);

    const assignments = await staff.get('/api/v1/gatekeeper/assignments').expect(200);
    expect(assignments.body.assignments.length).toBeGreaterThan(0);

    const scan = await staff
      .post('/api/v1/gatekeeper/check-in')
      .send({ qrToken, gateId: 'GATE-A' })
      .expect(201);

    expect(scan.body.result).toBe('success');
  });

  it('rejects duplicate check-in', async () => {
    const { qrToken } = await publishEventWithTicket();
    const staff = await loginAsGatekeeper(app);

    await staff
      .post('/api/v1/gatekeeper/check-in')
      .send({ qrToken, gateId: 'GATE-A' })
      .expect(201);

    const second = await staff
      .post('/api/v1/gatekeeper/check-in')
      .send({ qrToken, gateId: 'GATE-A' })
      .expect(201);

    expect(second.body.result).toBe('already_used');
  });

  it('rejects unassigned gatekeeper', async () => {
    const { qrToken } = await publishEventWithTicket();
    await createGatekeeperUser(userModel, 'other-gk@example.com');
    const other = await loginAsGatekeeper(app, 'other-gk@example.com');

    const res = await other
      .post('/api/v1/gatekeeper/check-in')
      .send({ qrToken, gateId: 'GATE-A' })
      .expect(201);

    expect(res.body.result).toBe('unauthorised');
  });

  it('allows multiple scans on one QR when quantity is greater than one', async () => {
    const admin = await loginAsAdmin(app);
    const eventRes = await admin.post('/api/v1/admin/events').send(sampleEvent).expect(201);
    const eventId = eventRes.body.event.id as string;
    const pkgRes = await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'Entry',
        priceMinor: 10000,
        admissionCount: 1,
        quantityTotal: 20,
      })
      .expect(201);
    await admin
      .patch(`/api/v1/admin/events/${eventId}/status`)
      .send({ status: 'published' })
      .expect(200);
    const gatekeeper = await userModel.findOne({ email: 'gatekeeper@example.com' });
    await admin
      .post(`/api/v1/admin/gatekeepers/${gatekeeper!._id.toString()}/assignments`)
      .send({ eventId, gateId: 'GATE-A' })
      .expect(201);
    const attendee = request.agent(app.getHttpServer());
    await attendee
      .post('/api/v1/auth/register')
      .send({ name: 'Group', email: 'group@example.com', password: 'password123' })
      .expect(201);
    await attendee
      .post('/api/v1/auth/login')
      .send({ email: 'group@example.com', password: 'password123' })
      .expect(200);
    const booking = await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId: pkgRes.body.package.id, quantity: 5 }],
      })
      .expect(201);
    const qrToken = booking.body.tickets[0].qrToken as string;
    const staff = await loginAsGatekeeper(app);

    for (let i = 0; i < 5; i += 1) {
      const scan = await staff
        .post('/api/v1/gatekeeper/check-in')
        .send({ qrToken, gateId: 'GATE-A' })
        .expect(201);
      expect(scan.body.result).toBe('success');
    }

    const sixth = await staff
      .post('/api/v1/gatekeeper/check-in')
      .send({ qrToken, gateId: 'GATE-A' })
      .expect(201);
    expect(sixth.body.result).toBe('already_used');
  });

  it('allows only one success under parallel scans for single admission', async () => {
    const { qrToken } = await publishEventWithTicket();
    const staff = await loginAsGatekeeper(app);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        staff.post('/api/v1/gatekeeper/check-in').send({ qrToken, gateId: 'GATE-A' }),
      ),
    );

    const successes = results.filter((r) => r.body.result === 'success');
    const alreadyUsed = results.filter((r) => r.body.result === 'already_used');
    expect(successes).toHaveLength(1);
    expect(alreadyUsed.length).toBeGreaterThanOrEqual(1);
  });
});
