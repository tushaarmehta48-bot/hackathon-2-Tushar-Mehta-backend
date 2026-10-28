import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { EventStatus } from './enums/event-status.enum.js';
import { assertStatusTransition } from './event-status.transitions.js';

describe('assertStatusTransition', () => {
  it('allows draft to published', () => {
    expect(() =>
      assertStatusTransition(EventStatus.Draft, EventStatus.Published),
    ).not.toThrow();
  });

  it('blocks completed to published', () => {
    expect(() =>
      assertStatusTransition(EventStatus.Completed, EventStatus.Published),
    ).toThrow(BadRequestException);
  });
});
