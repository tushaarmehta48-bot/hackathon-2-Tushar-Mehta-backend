import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ASSISTANT_STATES, type AssistantState } from '../assistant.state.js';

export class AssistantContextDto {
  @IsOptional()
  @IsMongoId()
  eventId?: string;

  @IsOptional()
  @IsMongoId()
  packageId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class AssistantTurnDto {
  @IsIn(ASSISTANT_STATES)
  state!: AssistantState;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsIn(['en', 'hi'])
  locale?: 'en' | 'hi';

  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantContextDto)
  context?: AssistantContextDto;
}
