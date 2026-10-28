import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { AppModule as AppModuleType } from '../src/app.module.js';
import { closeTestApp, createTestApp } from './helpers/create-test-app.js';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;
  let AppModule: typeof AppModuleType;

  beforeAll(async () => {
    ({ AppModule } = await import('../src/app.module.js'));
  });

  beforeEach(async () => {
    app = await createTestApp(AppModule);
  });

  afterEach(async () => {
    if (app) {
      await closeTestApp(app);
    }
  });

  it('GET /api/v1/health returns ok when MongoDB is connected', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.mongodb).toBe('connected');
  });
});
