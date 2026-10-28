export const BookingStatus = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  Cancelled: 'cancelled',
  Refunded: 'refunded',
  Failed: 'failed',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BOOKING_STATUSES = Object.values(BookingStatus);
