import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { eventBannerDir, isSafeBannerFilename } from './upload-paths.js';

@Controller('media/event-banners')
export class AdminMediaController {
  /** Public read — filenames are unguessable UUIDs. */
  @Get(':filename')
  serveBanner(@Param('filename') filename: string, @Res() res: Response) {
    const safe = basename(filename);
    if (!isSafeBannerFilename(safe)) {
      throw new NotFoundException('File not found');
    }
    const path = join(eventBannerDir(), safe);
    if (!existsSync(path)) {
      throw new NotFoundException('File not found');
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
