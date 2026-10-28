import { MongoMemoryReplSet } from 'mongodb-memory-server';

export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  process.env.MONGODB_URI = replSet.getUri();
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
  process.env.CORS_ORIGIN = 'http://localhost:3001';
  process.env.SESSION_SECRET = 'test-session-secret-min-16chars';

  return async () => {
    await replSet.stop();
  };
}
