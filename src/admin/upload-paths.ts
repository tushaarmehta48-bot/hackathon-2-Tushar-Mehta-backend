import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export function eventBannerDir() {
  const backendDir = join(process.cwd(), 'backend', 'uploads', 'event-banners');
  const rootDir = join(process.cwd(), 'uploads', 'event-banners');
  const dir = existsSync(backendDir) || existsSync(join(process.cwd(), 'backend')) ? backendDir : rootDir;
  mkdirSync(dir, { recursive: true });
  return dir;
}

const SAFE_NAME = /^[a-f0-9-]+\.(jpe?g|png|webp|gif)$/i;

export function isSafeBannerFilename(name: string) {
  return SAFE_NAME.test(name);
}
