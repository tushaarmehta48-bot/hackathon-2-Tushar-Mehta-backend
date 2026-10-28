import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePackageDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsInt()
  @Min(0)
  priceMinor!: number;

  @IsInt()
  @Min(1)
  admissionCount!: number;

  @IsInt()
  @Min(0)
  quantityTotal!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  saleStart?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  saleEnd?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
