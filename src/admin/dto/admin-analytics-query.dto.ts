import { IsMongoId, IsOptional } from 'class-validator';

export class AdminAnalyticsQueryDto {
  @IsOptional()
  @IsMongoId()
  eventId?: string;
}
