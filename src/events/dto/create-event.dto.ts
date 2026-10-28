import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

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
  @IsUrl()
  @MaxLength(2048)
  bannerUrl?: string;

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
