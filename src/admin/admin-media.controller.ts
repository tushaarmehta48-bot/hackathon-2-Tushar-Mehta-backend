import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { eventBannerDir, isSafeBannerFilename } from './upload-paths.js';

const FALLBACK_BANNER_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#18181b" />
    </linearGradient>
    <linearGradient id="glow" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#d85c41" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bg)" />
  <rect width="1280" height="800" fill="url(#glow)" />
  <circle cx="640" cy="380" r="85" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.2" stroke-width="2" />
  <path d="M610 355 C610 345 620 340 630 345 L665 365 C675 370 675 385 665 390 L630 410 C620 415 610 410 610 400 Z" fill="#ffffff" fill-opacity="0.85" />
  <text x="640" y="520" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="700" fill="#ffffff" fill-opacity="0.85" text-anchor="middle" letter-spacing="4">EVENTPULSE</text>
  <text x="640" y="555" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="500" fill="#ffffff" fill-opacity="0.45" text-anchor="middle" letter-spacing="1">EVENT BANNER</text>
</svg>`,
  'utf-8',
);

@Controller('media/event-banners')
export class AdminMediaController {
  /** Public read — filenames are unguessable UUIDs. */
  @Get(':filename')
  serveBanner(@Param('filename') filename: string, @Res() res: Response) {
    const safe = basename(filename);
    if (!isSafeBannerFilename(safe)) {
      throw new NotFoundException('File not found');
    }
    const candidates = [
      join(eventBannerDir(), safe),
      join(process.cwd(), 'uploads', 'event-banners', safe),
      join(process.cwd(), 'backend', 'uploads', 'event-banners', safe),
    ];
    const path = candidates.find((p) => existsSync(p));
    if (!path) {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.status(200).send(FALLBACK_BANNER_SVG);
      return;
    }
    const lower = safe.toLowerCase();
    const type = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.webp')
        ? 'image/webp'
        : lower.endsWith('.gif')
          ? 'image/gif'
          : 'image/jpeg';
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    createReadStream(path).pipe(res);
  }
}
