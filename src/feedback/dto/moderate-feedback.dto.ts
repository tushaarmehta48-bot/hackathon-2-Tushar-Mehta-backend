import { IsIn } from 'class-validator';
import {
  MODERATION_STATUSES,
  type ModerationStatus,
} from '../enums/moderation-status.enum.js';

export class ModerateFeedbackDto {
  @IsIn(MODERATION_STATUSES)
  moderationStatus!: ModerationStatus;
}
