import { Logger, ValidationPipe } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { configureSession } from './common/session/configure-session.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

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

  const corsOrigin = config.get<string>('corsOrigin');
  app.enableCors({
    origin: corsOrigin?.includes(',')
      ? corsOrigin.split(',').map((o) => o.trim())
      : corsOrigin,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('EventPulse API')
    .setDescription('REST API for EventPulse (session cookie auth)')
    .setVersion('1.0.0')
    .addCookieAuth('eventpulse.sid')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  const mongo = app.get<Connection>(getConnectionToken());
  if (mongo.readyState !== 1) {
    Logger.warn(
      `MongoDB not ready (state=${mongo.readyState}). Check MONGODB_URI and that MongoDB is running.`,
      'Bootstrap',
    );
  }

  Logger.log(`EventPulse API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();
