import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { EventsModule } from '../events/events.module.js';
import { AgentSessionService } from './agent-session.service.js';
import { AgentToolsController } from './agent-tools.controller.js';
import { AgentToolsService } from './agent-tools.service.js';
import { AgentWebhookGuard } from './guards/agent-webhook.guard.js';
import {
  AgentSession,
  AgentSessionSchema,
} from './schemas/agent-session.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentSession.name, schema: AgentSessionSchema },
    ]),
    AuthModule,
    EventsModule,
    BookingsModule,
  ],
  controllers: [AgentToolsController],
  providers: [AgentToolsService, AgentSessionService, AgentWebhookGuard],
})
export class AgentToolsModule {}
