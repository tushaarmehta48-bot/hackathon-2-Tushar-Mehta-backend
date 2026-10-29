import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteEventBannerDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2048)
  url!: string;
}
