import { filenameFromEventBannerUrl } from './banner-url.util.js';

/** Same-origin path so Vercel (or any frontend) can proxy `/api/v1` to the API. */
export function toPublicMediaPath(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) {
    return undefined;
  }
  const filename = filenameFromEventBannerUrl(trimmed);
  if (!filename) {
    return trimmed;
  }
  return `/api/v1/media/event-banners/${filename}`;
}

export function toPublicMediaPaths(urls: string[] | undefined): string[] {
  return (urls ?? [])
    .map((u) => toPublicMediaPath(u))
    .filter((u): u is string => Boolean(u));
}

/** Absolute URL for newly uploaded files (optional PUBLIC_API_URL override). */
export function buildUploadedMediaUrl(
  filename: string,
  publicApiBase?: string,
): string {
  const configured = publicApiBase?.replace(/\/$/, '');
  if (configured) {
    return `${configured}/media/event-banners/${filename}`;
  }
  return `/api/v1/media/event-banners/${filename}`;
}
