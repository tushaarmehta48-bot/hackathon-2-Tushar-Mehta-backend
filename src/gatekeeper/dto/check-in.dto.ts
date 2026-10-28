import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CheckInDto {
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  qrToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  gateId?: string;
}
