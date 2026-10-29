import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  isURL,
} from 'class-validator';
import { isSafeBannerFilename } from '../../admin/upload-paths.js';

/** Allow localhost and dev URLs from EventPulse uploads. */
export const EVENT_IMAGE_URL_OPTIONS = {
  require_tld: false,
  protocols: ['http', 'https'] as string[],
  require_protocol: true,
};

export function isValidEventImageUrl(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (isURL(trimmed, EVENT_IMAGE_URL_OPTIONS)) {
    return true;
  }
  // Allow EventPulse same-origin media paths: /api/v1/media/event-banners/:filename
  if (trimmed.startsWith('/api/v1/media/event-banners/')) {
    const filename = trimmed
      .slice('/api/v1/media/event-banners/'.length)
      .split(/[?#]/)[0];
    return isSafeBannerFilename(filename);
  }
  // Allow bare safe banner filenames
  if (isSafeBannerFilename(trimmed)) {
    return true;
  }
  return false;
}

export function IsEventImageUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isEventImageUrl',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `${propertyName} must be a valid image URL or EventPulse media path`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (value == null) return true;
          return isValidEventImageUrl(value);
        },
      },
    });
  };
}
