import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function eventBannerDir() {
  const dir = join(process.cwd(), 'uploads', 'event-banners');
  mkdirSync(dir, { recursive: true });
  return dir;
}

const SAFE_NAME = /^[a-f0-9-]+\.(jpe?g|png|webp|gif)$/i;

export function isSafeBannerFilename(name: string) {
  return SAFE_NAME.test(name);
}
