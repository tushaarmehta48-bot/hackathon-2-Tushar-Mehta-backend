import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminEventsController } from './admin-events.controller.js';
import { AdminPackagesController } from './admin-packages.controller.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema.js';
import {
  GatekeeperAssignment,
  GatekeeperAssignmentSchema,
} from '../gatekeeper/schemas/gatekeeper-assignment.schema.js';
import { Event, EventSchema } from './schemas/event.schema.js';
import {
  TicketPackage,
  TicketPackageSchema,
} from './schemas/ticket-package.schema.js';
import { TicketPackagesService } from './ticket-packages.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: TicketPackage.name, schema: TicketPackageSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: GatekeeperAssignment.name, schema: GatekeeperAssignmentSchema },
    ]),
    AuditModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [
    EventsController,
    AdminEventsController,
    AdminPackagesController,
  ],
  providers: [EventsService, TicketPackagesService],
  exports: [EventsService, TicketPackagesService],
})
export class EventsModule {}
