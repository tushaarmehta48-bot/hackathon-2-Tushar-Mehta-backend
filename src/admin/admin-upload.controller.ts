import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import type { Request } from 'express';
import { diskStorage } from 'multer';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { DeleteEventBannerDto } from './dto/delete-event-banner.dto.js';
import { filenameFromEventBannerUrl } from './banner-url.util.js';
import { buildUploadedMediaUrl } from './public-media-url.js';
import { eventBannerDir } from './upload-paths.js';
import { StoredMedia, StoredMediaDocument } from './schemas/stored-media.schema.js';

const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXT = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

function isAllowedImageUpload(file: {
  mimetype: string;
  originalname: string;
}): boolean {
  if (/^image\/(jpe?g|png|webp|gif)$/i.test(file.mimetype)) {
    return true;
  }
  const ext = extname(file.originalname).toLowerCase();
  return ALLOWED_IMAGE_EXT.has(ext);
}

@Controller('admin/uploads')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminUploadController {
  constructor(
    @InjectModel(StoredMedia.name)
    private readonly mediaModel: Model<StoredMediaDocument>,
  ) {}

  @Post('event-banner')
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BANNER_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!isAllowedImageUpload(file)) {
          cb(
            new BadRequestException(
              'Use a JPEG, PNG, WebP, or GIF image (max 5 MB).',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, eventBannerDir());
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
    }),
  )
  async uploadEventBanner(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No image file received. Choose a file after cropping, or sign in again as admin.',
      );
    }

    if (file.path && existsSync(file.path)) {
      try {
        const data = readFileSync(file.path);
        await this.mediaModel.findOneAndUpdate(
          { filename: file.filename },
          {
            filename: file.filename,
            contentType: file.mimetype || 'image/jpeg',
            data,
            size: file.size,
          },
          { upsert: true, new: true },
        );
      } catch {
        // Disk write already succeeded; ignore if DB write fails
      }
    }

    const url = buildUploadedMediaUrl(
      file.filename,
      process.env.PUBLIC_API_URL?.trim(),
    );
    return { url };
  }

  @Delete('event-banner')
  @HttpCode(200)
  async deleteEventBanner(@Body() body: DeleteEventBannerDto) {
    const url = body?.url?.trim();
    if (!url) {
      throw new BadRequestException('url is required');
    }
    const filename = filenameFromEventBannerUrl(url);
    if (!filename) {
      throw new BadRequestException('Only uploaded EventPulse images can be deleted');
    }
    const path = join(eventBannerDir(), filename);
    if (existsSync(path)) {
      unlinkSync(path);
    }
    await this.mediaModel.deleteOne({ filename }).exec();
    return { ok: true };
  }
}
