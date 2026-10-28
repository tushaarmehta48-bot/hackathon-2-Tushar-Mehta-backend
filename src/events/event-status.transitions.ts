import { BadRequestException } from '@nestjs/common';
import { EventStatus } from './enums/event-status.enum.js';

const ALLOWED: Record<EventStatus, EventStatus[]> = {
  [EventStatus.Draft]: [EventStatus.Published, EventStatus.Cancelled],
  [EventStatus.Published]: [
    EventStatus.SoldOut,
    EventStatus.Completed,
    EventStatus.Cancelled,
  ],
  [EventStatus.SoldOut]: [EventStatus.Completed, EventStatus.Cancelled],
  [EventStatus.Completed]: [],
  [EventStatus.Cancelled]: [],
};

export function assertStatusTransition(from: EventStatus, to: EventStatus) {
  if (from === to) {
    return;
  }
  const allowed = ALLOWED[from];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Cannot transition event status from "${from}" to "${to}"`,
    );
  }
}

export function isEventEditable(status: EventStatus) {
  return status === EventStatus.Draft || status === EventStatus.Published;
}
