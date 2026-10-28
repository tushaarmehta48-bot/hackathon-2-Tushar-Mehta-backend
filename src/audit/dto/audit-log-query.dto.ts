import { Type } from 'class-transformer';
import {
  IsDate,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AuditLogQueryDto {
  @IsOptional()
  @IsMongoId()
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetType?: string;

  @IsOptional()
  @IsMongoId()
  targetId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
