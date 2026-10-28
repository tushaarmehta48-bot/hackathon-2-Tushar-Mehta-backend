import type { TicketPackageDocument } from '../schemas/ticket-package.schema.js';
import type {
  EventAvailability,
  EventAvailabilitySummary,
  PackageAvailability,
} from './inventory.types.js';

export function quantityRemaining(
  quantityTotal: number,
  quantitySold: number,
): number {
  return Math.max(0, quantityTotal - quantitySold);
}

export function isPackageOnSale(
  pkg: Pick<
    TicketPackageDocument,
    'active' | 'saleStart' | 'saleEnd' | 'quantityTotal' | 'quantitySold'
  >,
  now: Date = new Date(),
): boolean {
  if (!pkg.active) {
    return false;
  }
  const remaining = quantityRemaining(pkg.quantityTotal, pkg.quantitySold);
  if (remaining <= 0) {
    return false;
  }
  if (pkg.saleStart && now < pkg.saleStart) {
    return false;
  }
  if (pkg.saleEnd && now > pkg.saleEnd) {
    return false;
  }
  return true;
}

export function buildPackageAvailability(
  pkg: TicketPackageDocument,
  now: Date = new Date(),
): PackageAvailability {
  const remaining = quantityRemaining(pkg.quantityTotal, pkg.quantitySold);
  return {
    id: pkg._id.toString(),
    name: pkg.name,
    priceMinor: pkg.priceMinor,
    admissionCount: pkg.admissionCount,
    quantityTotal: pkg.quantityTotal,
    quantitySold: pkg.quantitySold,
    quantityRemaining: remaining,
    active: pkg.active,
    onSale: isPackageOnSale(pkg, now),
    saleStart: pkg.saleStart,
    saleEnd: pkg.saleEnd,
  };
}

export function buildEventAvailability(params: {
  eventId: string;
  eventStatus: string;
  eventCapacity: number;
  packages: TicketPackageDocument[];
  now?: Date;
}): EventAvailability {
  const now = params.now ?? new Date();
  const packageRows = params.packages.map((pkg) =>
    buildPackageAvailability(pkg, now),
  );

  const activePackages = packageRows.filter((p) => p.active);
  const ticketsTotal = activePackages.reduce(
    (sum, p) => sum + p.quantityTotal,
    0,
  );
  const ticketsSold = activePackages.reduce(
    (sum, p) => sum + p.quantitySold,
    0,
  );
  const ticketsRemaining = activePackages.reduce(
    (sum, p) => sum + p.quantityRemaining,
    0,
  );
  const admissionsSold = activePackages.reduce(
    (sum, p) => sum + p.quantitySold * p.admissionCount,
    0,
  );
  const admissionsRemaining = activePackages.reduce(
    (sum, p) => sum + p.quantityRemaining * p.admissionCount,
    0,
  );
  const eventCapacityRemaining = Math.max(
    0,
    params.eventCapacity - admissionsSold,
  );

  const hasOnSaleInventory = packageRows.some((p) => p.onSale);
  const isSoldOut =
    params.eventStatus === 'sold_out' ||
    (params.eventStatus === 'published' &&
      (!hasOnSaleInventory ||
        ticketsRemaining <= 0 ||
        eventCapacityRemaining <= 0));

  const summary: EventAvailabilitySummary = {
    packagesActive: activePackages.length,
    ticketsTotal,
    ticketsSold,
    ticketsRemaining,
    admissionsSold,
    admissionsRemaining,
    eventCapacity: params.eventCapacity,
    eventCapacityRemaining,
    isSoldOut,
  };

  return {
    eventId: params.eventId,
    eventStatus: params.eventStatus,
    packages: packageRows,
    summary,
  };
}
