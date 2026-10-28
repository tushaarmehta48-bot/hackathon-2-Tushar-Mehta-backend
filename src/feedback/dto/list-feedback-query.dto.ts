import { IsIn, IsMongoId, IsOptional } from 'class-validator';
import {
  MODERATION_STATUSES,
  type ModerationStatus,
} from '../enums/moderation-status.enum.js';

export class ListFeedbackQueryDto {
  @IsOptional()
  @IsMongoId()
  eventId?: string;

  @IsOptional()
  @IsIn(MODERATION_STATUSES)
  moderationStatus?: ModerationStatus;
}
