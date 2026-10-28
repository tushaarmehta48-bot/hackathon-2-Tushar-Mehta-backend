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
import { createAdminUser, loginAsAdmin } from './helpers/auth-agent.js';
import {
  closeTestApp,
  createTestApp,
  resetDatabase,
} from './helpers/create-test-app.js';

const sampleEvent = {
  title: 'Inventory Fest',
  description: 'Inventory e2e event',
  category: 'festival',
  venue: 'Arena',
  address: '1 Main St',
  startAt: new Date('2026-12-01T09:00:00.000Z').toISOString(),
  endAt: new Date('2026-12-01T18:00:00.000Z').toISOString(),
  timezone: 'Asia/Kolkata',
  capacity: 50,
};

describe('Inventory (e2e)', () => {
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

  async function publishEventWithPackage() {
    const admin = await loginAsAdmin(app);
    const createRes = await admin
      .post('/api/v1/admin/events')
      .send(sampleEvent)
      .expect(201);
    const eventId = createRes.body.event.id;

    const pkgRes = await admin
      .post(`/api/v1/admin/events/${eventId}/packages`)
      .send({
        name: 'GA Pass',
        priceMinor: 25000,
        admissionCount: 1,
        quantityTotal: 10,
      })
      .expect(201);

    await admin
      .patch(`/api/v1/admin/events/${eventId}/status`)
      .send({ status: 'published' })
      .expect(200);

    return { eventId, packageId: pkgRes.body.package.id as string };
  }

  it('returns ticket packages and availability for published event', async () => {
    const { eventId } = await publishEventWithPackage();

    const packages = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}/ticket-packages`)
      .expect(200);

    expect(packages.body.packages).toHaveLength(1);
    expect(packages.body.packages[0].quantityRemaining).toBe(10);
    expect(packages.body.packages[0].onSale).toBe(true);

    const availability = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}/availability`)
      .expect(200);

    expect(availability.body.availability.summary.ticketsTotal).toBe(10);
    expect(availability.body.availability.summary.ticketsRemaining).toBe(10);
    expect(availability.body.availability.summary.isSoldOut).toBe(false);
  });

  it('marks event sold_out when all package inventory is sold', async () => {
    const { eventId, packageId } = await publishEventWithPackage();

    await packageModel.findByIdAndUpdate(packageId, { quantitySold: 10 });

    const availability = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}/availability`)
      .expect(200);

    expect(availability.body.availability.summary.isSoldOut).toBe(true);

    const eventRes = await request(app.getHttpServer())
      .get(`/api/v1/events/${eventId}`)
      .expect(200);

    expect(eventRes.body.event.status).toBe('sold_out');
  });

  it('returns admin inventory summary', async () => {
    const { eventId } = await publishEventWithPackage();
    const admin = await loginAsAdmin(app);

    const res = await admin
      .get(`/api/v1/admin/events/${eventId}/inventory`)
      .expect(200);

    expect(res.body.availability.summary.ticketsRemaining).toBe(10);
  });
});
