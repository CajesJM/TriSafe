import { IsEmail, IsOptional, IsPhoneNumber, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'Username may only contain letters, numbers, dots, underscores, and hyphens' })
  username?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsEmail()
  @Matches(/^[^\s@]+@gmail\.com$/i, { message: 'Email must be a valid @gmail.com address without spaces' })
  email?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsPhoneNumber('PH')
  @Matches(/^\+63\d{10}$/, { message: 'Phone number must contain +63 followed by exactly 10 digits' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2_000_000)
  avatarData?: string | null;
}
