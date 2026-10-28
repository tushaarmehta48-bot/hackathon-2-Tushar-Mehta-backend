import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { USER_ROLES, type UserRole } from '../../users/enums/user-role.enum.js';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  /** When set (admin/staff login pages), user must have this role. */
  @IsOptional()
  @IsIn(USER_ROLES)
  intendedRole?: UserRole;
}
