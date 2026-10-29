export type EventCalendarPhase = 'upcoming' | 'live' | 'ended';

export function getEventCalendarPhase(
  startAt: Date,
  endAt: Date,
  now: Date = new Date(),
): EventCalendarPhase {
  if (now.getTime() > endAt.getTime()) {
    return 'ended';
  }
  if (now.getTime() >= startAt.getTime()) {
    return 'live';
  }
  return 'upcoming';
}

export function isBookingOpenBySchedule(
  startAt: Date,
  endAt: Date,
  now: Date = new Date(),
): boolean {
  return getEventCalendarPhase(startAt, endAt, now) === 'live';
}
