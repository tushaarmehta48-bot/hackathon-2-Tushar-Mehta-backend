export const UserStatus = {
  Active: 'active',
  Disabled: 'disabled',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const USER_STATUSES = Object.values(UserStatus);
