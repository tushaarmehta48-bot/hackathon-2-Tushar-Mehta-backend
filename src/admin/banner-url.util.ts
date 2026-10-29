import { basename } from 'node:path';
import { isSafeBannerFilename } from './upload-paths.js';

/** Filename for files served under `/api/v1/media/event-banners/:filename`. */
export function filenameFromEventBannerUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'event-banners');
    const name = idx >= 0 ? parts[idx + 1] : parts.at(-1);
    if (!name) return null;
    const safe = basename(name);
    return isSafeBannerFilename(safe) ? safe : null;
  } catch {
    return null;
  }
}

export function isHostedEventBannerUrl(url: string): boolean {
  return filenameFromEventBannerUrl(url) !== null;
}
