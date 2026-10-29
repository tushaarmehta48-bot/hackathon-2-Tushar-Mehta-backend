import type { EventDocument } from './schemas/event.schema.js';

const MAX_CARD_IMAGES = 12;

export function resolveCardImageUrls(event: {
  cardImageUrls?: string[];
  bannerUrl?: string;
}): string[] {
  const fromArray = (event.cardImageUrls ?? [])
    .map((u) => u.trim())
    .filter(Boolean);
  if (fromArray.length > 0) {
    return fromArray.slice(0, MAX_CARD_IMAGES);
  }
  const legacy = event.bannerUrl?.trim();
  return legacy ? [legacy] : [];
}

export function normalizeCardImageInput(input: {
  cardImageUrls?: string[];
  bannerUrl?: string;
}): { cardImageUrls: string[]; bannerUrl?: string } | undefined {
  if (input.cardImageUrls !== undefined) {
    const cardImageUrls = input.cardImageUrls
      .map((u) => u.trim())
      .filter(Boolean)
      .slice(0, MAX_CARD_IMAGES);
    return {
      cardImageUrls,
      bannerUrl: cardImageUrls[0],
    };
  }
  if (input.bannerUrl !== undefined) {
    const single = input.bannerUrl?.trim();
    return {
      cardImageUrls: single ? [single] : [],
      bannerUrl: single,
    };
  }
  return undefined;
}

export function applyCardImagesToDocument(
  event: EventDocument,
  normalized: { cardImageUrls: string[]; bannerUrl?: string },
) {
  event.cardImageUrls = normalized.cardImageUrls;
  event.bannerUrl = normalized.bannerUrl;
}
