export const UserRole = {
  Attendee: 'attendee',
  Gatekeeper: 'gatekeeper',
  Admin: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLES = Object.values(UserRole);
