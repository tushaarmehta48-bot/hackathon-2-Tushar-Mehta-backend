import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
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

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}

await bootstrap();
