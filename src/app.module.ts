import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AssistantModule } from './assistant/assistant.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { GatekeeperModule } from './gatekeeper/gatekeeper.module.js';
import { EventsModule } from './events/events.module.js';
import configuration from './config/configuration.js';
import { validate } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 200 }],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongodb.uri'),
      }),
    }),
    HealthModule,
    AuthModule,
    EventsModule,
    BookingsModule,
    GatekeeperModule,
    AdminModule,
    FeedbackModule,
    AssistantModule,
    RealtimeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
