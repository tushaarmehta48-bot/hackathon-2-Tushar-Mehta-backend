import { IsIn } from 'class-validator';
import { EVENT_STATUSES, type EventStatus } from '../enums/event-status.enum.js';

export class UpdateEventStatusDto {
  @IsIn(EVENT_STATUSES)
  status!: EventStatus;
}
