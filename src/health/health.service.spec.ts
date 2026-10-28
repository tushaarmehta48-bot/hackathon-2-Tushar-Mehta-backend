import { HealthService } from './health.service.js';
import type { Connection } from 'mongoose';

describe('HealthService', () => {
  it('reports connected when mongoose readyState is 1', () => {
    const connection = { readyState: 1 } as Connection;
    const service = new HealthService(connection);
    expect(service.check()).toMatchObject({
      status: 'ok',
      mongodb: 'connected',
    });
  });

  it('reports degraded when mongoose is not connected', () => {
    const connection = { readyState: 0 } as Connection;
    const service = new HealthService(connection);
    expect(service.check()).toMatchObject({
      status: 'degraded',
      mongodb: 'disconnected',
    });
  });
});
