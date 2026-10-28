import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { ListFeedbackQueryDto } from './dto/list-feedback-query.dto.js';
import { ModerateFeedbackDto } from './dto/moderate-feedback.dto.js';
import { FeedbackService } from './feedback.service.js';

@Controller('admin/feedback')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminFeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  async list(@Query() query: ListFeedbackQueryDto) {
    const rows = await this.feedbackService.listAdmin(query);
    return { feedback: rows.map((row) => this.feedbackService.toAdmin(row)) };
  }

  @Patch(':id/moderation')
  async moderate(@Param('id') id: string, @Body() dto: ModerateFeedbackDto) {
    const feedback = await this.feedbackService.moderate(
      id,
      dto.moderationStatus,
    );
    return { feedback: this.feedbackService.toAdmin(feedback) };
  }
}
