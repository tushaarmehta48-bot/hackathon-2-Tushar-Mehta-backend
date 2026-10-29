import { Logger } from '@nestjs/common';
import type { Connection } from 'mongoose';
import { describeMongoUri } from '../config/mongodb-uri.js';

const logger = new Logger('MongoDB');

export function attachMongoConnectionLogging(
  connection: Connection,
  uriHint?: string,
): Connection {
  const target = uriHint ? describeMongoUri(uriHint) : 'cluster';

  if (connection.readyState === 1) {
    logger.log(`MongoDB connected successfully (${target})`);
  }

  connection.on('connected', () => {
    logger.log(`MongoDB connected successfully (${target})`);
  });

  connection.on('error', (err: Error) => {
    const msg = err.message ?? String(err);
    if (/auth|authentication|bad auth/i.test(msg)) {
      logger.error(
        `MongoDB authentication failed for ${target}. Check Atlas username/password, remove spaces after mongodb+srv:// in MONGODB_URI, and confirm the user has access to this cluster.`,
      );
      return;
    }
    logger.error(`MongoDB connection error (${target}): ${msg}`);
  });

  connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  return connection;
}
