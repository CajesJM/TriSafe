import { UserRole, UserStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsPhoneNumber('PH')
  phone?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsString()
  @MinLength(8)
  temporaryPassword!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @ValidateIf((_, value) => value !== undefined && value !== '')
  @IsPhoneNumber('PH')
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;
}
