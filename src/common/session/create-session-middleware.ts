import MongoStore from 'connect-mongo';
import session from 'express-session';

export function createSessionMiddleware(options: {
  secret: string;
  nodeEnv: string;
  mongoUri?: string;
}) {
  const store =
    options.nodeEnv === 'test'
      ? new session.MemoryStore()
      : MongoStore.create({
          mongoUrl: options.mongoUri,
          collectionName: 'sessions',
        });

  return session({
    name: 'eventpulse.sid',
    secret: options.secret,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      secure: options.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  });
}
