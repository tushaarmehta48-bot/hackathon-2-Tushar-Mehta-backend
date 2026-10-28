import { describe, expect, it } from 'vitest';
import {
  buildEventAvailability,
  isPackageOnSale,
  quantityRemaining,
} from './inventory.calculator.js';

describe('inventory.calculator', () => {
  it('computes remaining quantity', () => {
    expect(quantityRemaining(10, 3)).toBe(7);
    expect(quantityRemaining(5, 8)).toBe(0);
  });

  it('detects on-sale packages', () => {
    const now = new Date('2026-06-15T12:00:00.000Z');
    expect(
      isPackageOnSale(
        {
          active: true,
          quantityTotal: 10,
          quantitySold: 2,
          saleStart: new Date('2026-06-01T00:00:00.000Z'),
          saleEnd: new Date('2026-07-01T00:00:00.000Z'),
        },
        now,
      ),
    ).toBe(true);
    expect(
      isPackageOnSale(
        {
          active: true,
          quantityTotal: 10,
          quantitySold: 10,
          saleStart: undefined,
          saleEnd: undefined,
        },
        now,
      ),
    ).toBe(false);
  });

  it('derives event sold out when no on-sale inventory remains', () => {
    const availability = buildEventAvailability({
      eventId: 'evt1',
      eventStatus: 'published',
      eventCapacity: 100,
      packages: [
        {
          _id: { toString: () => 'p1' },
          name: 'Single',
          priceMinor: 1000,
          admissionCount: 1,
          quantityTotal: 5,
          quantitySold: 5,
          active: true,
        } as never,
      ],
    });

    expect(availability.summary.ticketsRemaining).toBe(0);
    expect(availability.summary.isSoldOut).toBe(true);
  });
});
