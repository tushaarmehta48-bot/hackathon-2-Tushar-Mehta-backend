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
  title: 'Analytics Fest',
  description: 'Reports e2e',
  category: 'festival',
  venue: 'Arena',
  address: '4 Report Rd',
  startAt: new Date('2026-12-01T09:00:00.000Z').toISOString(),
  endAt: new Date('2026-12-01T18:00:00.000Z').toISOString(),
  timezone: 'Asia/Kolkata',
  capacity: 100,
};

describe('Admin reports (e2e)', () => {
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

  it('returns analytics and check-in report matching fixture activity', async () => {
    const admin = await loginAsAdmin(app);
    const eventRes = await admin.post('/api/v1/admin/events').send(sampleEvent).expect(201);
    const eventId = eventRes.body.event.id as string;

    const pkgRes = await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'GA',
        priceMinor: 20000,
        admissionCount: 1,
        quantityTotal: 10,
      })
      .expect(201);

    await admin
      .patch(`/api/v1/admin/events/${eventId}/status`)
      .send({ status: 'published' })
      .expect(200);

    const gatekeeper = await userModel.findOne({ email: 'gatekeeper@example.com' });
    await admin
      .post(`/api/v1/admin/gatekeepers/${gatekeeper!._id.toString()}/assignments`)
      .send({ eventId })
      .expect(201);

    const attendee = request.agent(app.getHttpServer());
    await attendee
      .post('/api/v1/auth/register')
      .send({
        name: 'Fan',
        email: 'fan@example.com',
        password: 'password123',
      })
      .expect(201);

    await attendee
      .post('/api/v1/auth/login')
      .send({ email: 'fan@example.com', password: 'password123' })
      .expect(200);

    const booking = await attendee
      .post('/api/v1/bookings')
      .send({
        eventId,
        items: [{ packageId: pkgRes.body.package.id, quantity: 2 }],
      })
      .expect(201);

    const qrToken = booking.body.tickets[0].qrToken as string;
    const staff = await loginAsGatekeeper(app);
    await staff
      .post('/api/v1/gatekeeper/check-in')
      .send({ qrToken })
      .expect(201);

    const analytics = await admin
      .get(`/api/v1/admin/analytics?eventId=${eventId}`)
      .expect(200);

    expect(analytics.body.analytics.ticketsSold).toBe(2);
    expect(analytics.body.analytics.admissionsCheckedIn).toBe(1);
    expect(analytics.body.analytics.revenueMinor).toBe(40000);
    expect(analytics.body.analytics.checkInRate).toBe(0.5);

    const checkIns = await admin
      .get(`/api/v1/admin/check-ins?eventId=${eventId}&result=success`)
      .expect(200);

    expect(checkIns.body.checkIns.length).toBeGreaterThanOrEqual(1);
    expect(checkIns.body.checkIns[0].bookingReference).toBeDefined();
    expect(checkIns.body.checkIns[0].ticketCode).toBeDefined();
    expect(checkIns.body.checkIns[0]).not.toHaveProperty('email');
  });
});
