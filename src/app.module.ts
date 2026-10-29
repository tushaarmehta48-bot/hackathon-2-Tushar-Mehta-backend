import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { AdminModule } from './admin/admin.module.js';
import { AgentToolsModule } from './agent-tools/agent-tools.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { GatekeeperModule } from './gatekeeper/gatekeeper.module.js';
import { EventsModule } from './events/events.module.js';
import configuration from './config/configuration.js';
import { validate } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { attachMongoConnectionLogging } from './database/mongo-connection.factory.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 200 }],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('mongodb.uri') ?? '';
        return {
          uri,
          connectionFactory: (connection: import('mongoose').Connection) =>
            attachMongoConnectionLogging(connection, uri),
        };
      },
    }),
    HealthModule,
    AuthModule,
    EventsModule,
    BookingsModule,
    GatekeeperModule,
    AdminModule,
    FeedbackModule,
    AgentToolsModule,
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
