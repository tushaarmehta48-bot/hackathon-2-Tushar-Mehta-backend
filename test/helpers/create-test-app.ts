import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter.js';
import { configureSession } from '../../src/common/session/configure-session.js';
import type { AppModule as AppModuleType } from '../../src/app.module.js';

export async function createTestApp(AppModule: typeof AppModuleType) {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  configureSession(app);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

export async function closeTestApp(app: INestApplication) {
  const connection = app.get<Connection>(getConnectionToken());
  await connection.close();
  await app.close();
}
