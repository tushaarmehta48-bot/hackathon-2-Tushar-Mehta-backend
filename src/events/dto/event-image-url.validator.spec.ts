import { describe, expect, it } from 'vitest';
import { isValidEventImageUrl } from './event-image-url.validator.js';
import { filenameFromEventBannerUrl } from '../../admin/banner-url.util.js';

describe('event-image-url validator', () => {
  it('accepts valid https URLs', () => {
    expect(
      isValidEventImageUrl('https://images.unsplash.com/photo-1234.jpg'),
    ).toBe(true);
  });

  it('accepts relative EventPulse media paths', () => {
    expect(
      isValidEventImageUrl(
        '/api/v1/media/event-banners/a551c40e-b1ab-423e-a159-e042f6fa82c8.jpg',
      ),
    ).toBe(true);
  });

  it('accepts bare safe banner filenames', () => {
    expect(
      isValidEventImageUrl('7c11b83f-7591-4fcc-b299-758bcfe10419.jpg'),
    ).toBe(true);
  });

  it('rejects invalid or unsafe strings', () => {
    expect(isValidEventImageUrl('javascript:alert(1)')).toBe(false);
    expect(isValidEventImageUrl('../../etc/passwd')).toBe(false);
    expect(isValidEventImageUrl('')).toBe(false);
  });
});

describe('filenameFromEventBannerUrl', () => {
  it('extracts filename from relative EventPulse media path', () => {
    expect(
      filenameFromEventBannerUrl(
        '/api/v1/media/event-banners/a551c40e-b1ab-423e-a159-e042f6fa82c8.jpg',
      ),
    ).toBe('a551c40e-b1ab-423e-a159-e042f6fa82c8.jpg');
  });

  it('extracts filename from bare safe filename', () => {
    expect(
      filenameFromEventBannerUrl('7c11b83f-7591-4fcc-b299-758bcfe10419.jpg'),
    ).toBe('7c11b83f-7591-4fcc-b299-758bcfe10419.jpg');
  });

  it('extracts filename from absolute URL', () => {
    expect(
      filenameFromEventBannerUrl(
        'https://hackathon-2-tushar-mehta-frontend.vercel.app/api/v1/media/event-banners/e92aae45-dbe1-428f-a0dd-5c86bc681b81.jpg',
      ),
    ).toBe('e92aae45-dbe1-428f-a0dd-5c86bc681b81.jpg');
  });
});
