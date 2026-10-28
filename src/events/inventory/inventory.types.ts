export type PackageAvailability = {
  id: string;
  name: string;
  priceMinor: number;
  admissionCount: number;
  quantityTotal: number;
  quantitySold: number;
  quantityRemaining: number;
  active: boolean;
  onSale: boolean;
  saleStart?: Date;
  saleEnd?: Date;
};

export type EventAvailabilitySummary = {
  packagesActive: number;
  ticketsTotal: number;
  ticketsSold: number;
  ticketsRemaining: number;
  admissionsSold: number;
  admissionsRemaining: number;
  eventCapacity: number;
  eventCapacityRemaining: number;
  isSoldOut: boolean;
};

export type EventAvailability = {
  eventId: string;
  eventStatus: string;
  packages: PackageAvailability[];
  summary: EventAvailabilitySummary;
};
