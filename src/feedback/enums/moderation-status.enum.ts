export const ModerationStatus = {
  Visible: 'visible',
  Hidden: 'hidden',
} as const;

export type ModerationStatus =
  (typeof ModerationStatus)[keyof typeof ModerationStatus];

export const MODERATION_STATUSES = Object.values(ModerationStatus);
