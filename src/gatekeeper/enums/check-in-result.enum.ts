export const CheckInResult = {
  Success: 'success',
  AlreadyUsed: 'already_used',
  Invalid: 'invalid',
  Cancelled: 'cancelled',
  WrongEvent: 'wrong_event',
  Unauthorised: 'unauthorised',
} as const;

export type CheckInResult =
  (typeof CheckInResult)[keyof typeof CheckInResult];
