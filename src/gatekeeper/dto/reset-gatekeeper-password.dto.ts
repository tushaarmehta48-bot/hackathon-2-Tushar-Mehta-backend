import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetGatekeeperPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
