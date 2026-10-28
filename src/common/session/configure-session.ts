import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import MongoStore from 'connect-mongo';
import session from 'express-session';

export function configureSession(app: INestApplication) {
  const config = app.get(ConfigService);
  const nodeEnv = config.get<string>('nodeEnv');
  const secret = config.get<string>('session.secret');
  const mongoUri = config.get<string>('mongodb.uri');

  if (!secret) {
    throw new Error('SESSION_SECRET is required');
  }

  app.use(
    session({
      name: 'eventpulse.sid',
      secret,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: mongoUri,
        collectionName: 'sessions',
      }),
      cookie: {
        httpOnly: true,
        secure: nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
}
