import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CheckInResult } from '../../gatekeeper/enums/check-in-result.enum.js';

const CHECK_IN_RESULTS = Object.values(CheckInResult);

export class AdminCheckInsQueryDto {
  @IsOptional()
  @IsMongoId()
  eventId?: string;

  @IsOptional()
  @IsMongoId()
  gatekeeperId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  gateId?: string;

  @IsOptional()
  @IsMongoId()
  packageId?: string;

  @IsOptional()
  @IsIn(CHECK_IN_RESULTS)
  result?: CheckInResult;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
