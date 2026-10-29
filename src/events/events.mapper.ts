import { toPublicMediaPath, toPublicMediaPaths } from '../admin/public-media-url.js';
import { resolveCardImageUrls } from './event-images.util.js';
import { EventDocument } from './schemas/event.schema.js';
import { TicketPackageDocument } from './schemas/ticket-package.schema.js';

export function toPublicEvent(event: EventDocument) {
  const cardImageUrls = toPublicMediaPaths(resolveCardImageUrls(event));
  const bannerUrl = cardImageUrls[0] ?? toPublicMediaPath(event.bannerUrl);
  const heroImageUrl = toPublicMediaPath(event.heroImageUrl);
  return {
    id: event._id.toString(),
    title: event.title,
    description: event.description,
    category: event.category,
    cardImageUrls,
    bannerUrl,
    heroImageUrl,
    venue: event.venue,
    address: event.address,
    startAt: event.startAt,
    endAt: event.endAt,
    timezone: event.timezone,
    capacity: event.capacity,
    status: event.status,
    listingBadge: event.listingBadge ?? null,
    perUserTicketLimit: event.perUserTicketLimit,
    cancellationPolicy: event.cancellationPolicy,
    refundPolicy: event.refundPolicy,
    instructions: event.instructions,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

export function toAdminEvent(event: EventDocument) {
  return {
    ...toPublicEvent(event),
    createdBy: event.createdBy.toString(),
  };
}

export function toPackage(pkg: TicketPackageDocument) {
  return {
    id: pkg._id.toString(),
    eventId: pkg.eventId.toString(),
    name: pkg.name,
    description: pkg.description,
    priceMinor: pkg.priceMinor,
    admissionCount: pkg.admissionCount,
    quantityTotal: pkg.quantityTotal,
    quantitySold: pkg.quantitySold,
    saleStart: pkg.saleStart,
    saleEnd: pkg.saleEnd,
    perUserLimit: pkg.perUserLimit,
    active: pkg.active,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  };
}
