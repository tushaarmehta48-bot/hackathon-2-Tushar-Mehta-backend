import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

export type HealthStatus = {
  status: 'ok' | 'degraded';
  mongodb: 'connected' | 'disconnected';
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  check(): HealthStatus {
    const mongodb =
      this.connection.readyState === 1 ? 'connected' : 'disconnected';

    return {
      status: mongodb === 'connected' ? 'ok' : 'degraded',
      mongodb,
      timestamp: new Date().toISOString(),
    };
  }
}
