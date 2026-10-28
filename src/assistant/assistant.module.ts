import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module.js';
import { EventsModule } from '../events/events.module.js';
import { UsersModule } from '../users/users.module.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantService } from './assistant.service.js';

@Module({
  imports: [EventsModule, BookingsModule, UsersModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
