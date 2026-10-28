import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import type { SafeUser } from '../common/types/session.types.js';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto.js';
import { FeedbackService } from './feedback.service.js';

@Controller('events')
@UseGuards(SessionAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post(':eventId/feedback')
  async submit(
    @Param('eventId') eventId: string,
    @Body() dto: SubmitFeedbackDto,
    @CurrentUser() user: SafeUser,
  ) {
    const feedback = await this.feedbackService.submit(eventId, user.id, dto);
    return { feedback: this.feedbackService.toPublic(feedback) };
  }
}
