import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSessionMiddleware } from './create-session-middleware.js';

export function configureSession(app: INestApplication) {
  const config = app.get(ConfigService);
  const secret = config.get<string>('session.secret');
  const nodeEnv = config.get<string>('nodeEnv') ?? 'development';
  const mongoUri = config.get<string>('mongodb.uri');

  if (!secret) {
    throw new Error('SESSION_SECRET is required');
  }

  app.use(
    createSessionMiddleware({
      secret,
      nodeEnv,
      mongoUri,
    }),
  );
}
