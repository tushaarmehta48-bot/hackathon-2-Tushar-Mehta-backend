export const TicketStatus = {
  Valid: 'valid',
  Cancelled: 'cancelled',
  CheckedIn: 'checked_in',
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TICKET_STATUSES = Object.values(TicketStatus);
