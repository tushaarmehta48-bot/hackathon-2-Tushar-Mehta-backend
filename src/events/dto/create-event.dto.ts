import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { LISTING_BADGES } from '../enums/listing-badge.enum.js';
import { IsEventImageUrl } from './event-image-url.validator.js';

export class CreateEventDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsString()
  @MaxLength(80)
  category!: string;

  @IsOptional()
  @ValidateIf((_o, v) => v != null && String(v).trim() !== '')
  @IsEventImageUrl()
  @MaxLength(2048)
  bannerUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  @IsEventImageUrl({ each: true })
  cardImageUrls?: string[];

  @IsOptional()
  @ValidateIf((_o, v) => v != null && String(v).trim() !== '')
  @IsEventImageUrl()
  @MaxLength(2048)
  heroImageUrl?: string;

  @IsString()
  @MaxLength(200)
  venue!: string;

  @IsString()
  @MaxLength(500)
  address!: string;

  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @Type(() => Date)
  @IsDate()
  endAt!: Date;

  @IsString()
  @MaxLength(64)
  timezone!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsIn(LISTING_BADGES)
  listingBadge?: (typeof LISTING_BADGES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserTicketLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  cancellationPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  refundPolicy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;
}
