import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema.js';
import { Event, EventSchema } from '../events/schemas/event.schema.js';
import { UsersModule } from '../users/users.module.js';
import { AdminFeedbackController } from './admin-feedback.controller.js';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './feedback.service.js';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    UsersModule,
    AuthModule,
  ],
  controllers: [FeedbackController, AdminFeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
