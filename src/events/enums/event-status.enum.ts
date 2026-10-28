export const EventStatus = {
  Draft: 'draft',
  Published: 'published',
  SoldOut: 'sold_out',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const EVENT_STATUSES = Object.values(EventStatus);
