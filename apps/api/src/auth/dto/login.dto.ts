import { UserRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(/^[^\s]+$/, { message: 'Login identifier must not contain spaces' })
  identifier!: string;

  @IsString()
  // Driver temporary passwords are the LGU-issued Body Number or Permit
  // Number. Official record numbers may be as short as two characters.
  // Passenger/admin creation policies continue to enforce their own stronger
  // password requirements when credentials are issued or changed.
  @MinLength(2)
  password!: string;

  /**
   * Optional app-selected account type. The API remains compatible with the
   * Admin portal, which does not send this field, while the mobile app gets a
   * clear error if a Passenger selects Driver or vice versa.
   */
  @IsOptional()
  @IsEnum(UserRole)
  expectedRole?: UserRole;
}
