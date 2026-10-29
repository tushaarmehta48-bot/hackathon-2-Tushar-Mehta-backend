import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class ListEventsToolDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  fromDate?: string;
}

export class EventIdToolDto {
  @IsMongoId()
  eventId!: string;
}

export class SignInAttendeeToolDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class QuoteBookingToolDto {
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  agentSessionToken!: string;

  @IsMongoId()
  eventId!: string;

  @IsMongoId()
  packageId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateBookingToolDto extends QuoteBookingToolDto {
  @IsBoolean()
  userConfirmed!: boolean;
}

export class SessionTokenToolDto {
  @IsString()
  @MinLength(16)
  @MaxLength(128)
  agentSessionToken!: string;
}
