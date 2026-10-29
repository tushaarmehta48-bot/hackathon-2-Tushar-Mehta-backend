import type { BookingDocument } from './schemas/booking.schema.js';
import type { TicketDocument } from './schemas/ticket.schema.js';

export function toBookingSummary(booking: BookingDocument) {
  return {
    id: booking._id.toString(),
    reference: booking.reference,
    eventId: booking.eventId.toString(),
    items: booking.items.map((item) => ({
      packageId: item.packageId.toString(),
      packageName: item.packageName,
      priceMinor: item.priceMinor,
      admissionCount: item.admissionCount,
      quantity: item.quantity,
      lineTotalMinor: item.lineTotalMinor,
    })),
    totalMinor: booking.totalMinor,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export function toTicketPublic(ticket: TicketDocument) {
  const admissionsTotal = ticket.admissionsTotal ?? 1;
  const admissionsUsed = ticket.admissionsUsed ?? 0;
  return {
    id: ticket._id.toString(),
    ticketCode: ticket.ticketCode,
    qrToken: ticket.qrToken,
    eventId: ticket.eventId.toString(),
    packageId: ticket.packageId.toString(),
    status: ticket.status,
    checkedInAt: ticket.checkedInAt,
    admissionsTotal,
    admissionsUsed,
    admissionsRemaining: Math.max(0, admissionsTotal - admissionsUsed),
  };
}
