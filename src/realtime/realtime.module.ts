import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { RealtimeEmitterService } from './realtime-emitter.service.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
  imports: [UsersModule],
  providers: [RealtimeGateway, RealtimeEmitterService],
  exports: [RealtimeEmitterService],
})
export class RealtimeModule {}
