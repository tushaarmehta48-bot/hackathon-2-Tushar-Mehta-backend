import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module.js';
import { Event, EventSchema } from '../events/schemas/event.schema.js';
import {
  TicketPackage,
  TicketPackageSchema,
} from '../events/schemas/ticket-package.schema.js';
import { UsersModule } from '../users/users.module.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { Booking, BookingSchema } from './schemas/booking.schema.js';
import { Ticket, TicketSchema } from './schemas/ticket.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Event.name, schema: EventSchema },
      { name: TicketPackage.name, schema: TicketPackageSchema },
    ]),
    EventsModule,
    UsersModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
