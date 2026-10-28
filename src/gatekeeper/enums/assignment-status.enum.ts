export const AssignmentStatus = {
  Active: 'active',
  Inactive: 'inactive',
} as const;

export type AssignmentStatus =
  (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const ASSIGNMENT_STATUSES = Object.values(AssignmentStatus);
