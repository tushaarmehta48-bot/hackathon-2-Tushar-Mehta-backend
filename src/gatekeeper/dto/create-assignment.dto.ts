import { Type } from 'class-transformer';
import {
  IsDate,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsMongoId()
  eventId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  gateId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;
}
