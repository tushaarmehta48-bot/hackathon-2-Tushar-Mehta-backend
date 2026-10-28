import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema.js';
import { Ticket, TicketSchema } from '../bookings/schemas/ticket.schema.js';
import { Event, EventSchema } from '../events/schemas/event.schema.js';
import {
  TicketPackage,
  TicketPackageSchema,
} from '../events/schemas/ticket-package.schema.js';
import { CheckIn, CheckInSchema } from '../gatekeeper/schemas/check-in.schema.js';
import { UsersModule } from '../users/users.module.js';
import { AdminReportsController } from './admin-reports.controller.js';
import { AdminReportsService } from './admin-reports.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: TicketPackage.name, schema: TicketPackageSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: CheckIn.name, schema: CheckInSchema },
    ]),
    UsersModule,
    AuthModule,
  ],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
})
export class AdminModule {}
