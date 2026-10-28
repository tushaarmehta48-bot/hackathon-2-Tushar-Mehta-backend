export const AssistantState = {
  Idle: 'idle',
  Listening: 'listening',
  Understanding: 'understanding',
  SearchingEvents: 'searching_events',
  SelectingEvent: 'selecting_event',
  CollectingDetails: 'collecting_details',
  CheckingAvailability: 'checking_availability',
  AwaitingConfirmation: 'awaiting_confirmation',
  Booking: 'booking',
  Success: 'success',
  Error: 'error',
} as const;

export type AssistantState =
  (typeof AssistantState)[keyof typeof AssistantState];

export const ASSISTANT_STATES = Object.values(AssistantState);
