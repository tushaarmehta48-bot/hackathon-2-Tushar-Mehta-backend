export const ListingBadge = {
  Live: 'live',
  Upcoming: 'upcoming',
} as const;

export type ListingBadge = (typeof ListingBadge)[keyof typeof ListingBadge];

export const LISTING_BADGES = Object.values(ListingBadge);
