import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module.js';
import { Ticket, TicketSchema } from '../bookings/schemas/ticket.schema.js';
import { Event, EventSchema } from '../events/schemas/event.schema.js';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { UsersModule } from '../users/users.module.js';
import { AdminGatekeepersController } from './admin-gatekeepers.controller.js';
import { CheckInService } from './check-in.service.js';
import { GatekeeperAssignmentsService } from './gatekeeper-assignments.service.js';
import { GatekeeperController } from './gatekeeper.controller.js';
import { CheckIn, CheckInSchema } from './schemas/check-in.schema.js';
import {
  GatekeeperAssignment,
  GatekeeperAssignmentSchema,
} from './schemas/gatekeeper-assignment.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GatekeeperAssignment.name, schema: GatekeeperAssignmentSchema },
      { name: CheckIn.name, schema: CheckInSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    AuditModule,
    UsersModule,
    AuthModule,
    RealtimeModule,
  ],
  controllers: [GatekeeperController, AdminGatekeepersController],
  providers: [GatekeeperAssignmentsService, CheckInService],
  exports: [GatekeeperAssignmentsService, CheckInService],
})
export class GatekeeperModule {}
