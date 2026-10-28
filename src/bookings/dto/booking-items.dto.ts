import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  Min,
  ValidateNested,
} from 'class-validator';

export class BookingLineItemDto {
  @IsMongoId()
  packageId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class BookingRequestDto {
  @IsMongoId()
  eventId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookingLineItemDto)
  items!: BookingLineItemDto[];
}
