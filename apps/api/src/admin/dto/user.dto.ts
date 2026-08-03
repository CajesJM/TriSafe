import { UserRole, UserStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsPhoneNumber, IsString, Length, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

const lowercaseText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
const usernamePattern = /^(?=.{3,30}$)[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[\p{L}][\p{L} .,'-]*$/u, { message: 'fullName contains invalid characters' })
  fullName!: string;

  @Transform(lowercaseText)
  @ValidateIf((object: CreateUserDto, value) => object.role === UserRole.PASSENGER || value !== undefined)
  @IsString()
  @Length(3, 30)
  @Matches(usernamePattern, { message: 'username must begin with a letter and may use lowercase letters, numbers, dots, underscores, or hyphens without repeated separators' })
  username?: string;

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
  @MaxLength(100)
  @Matches(/^[\p{L}][\p{L} .,'-]*$/u, { message: 'fullName contains invalid characters' })
  fullName?: string;

  @Transform(lowercaseText)
  @IsOptional()
  @IsString()
  @Length(3, 30)
  @Matches(usernamePattern, { message: 'username must begin with a letter and may use lowercase letters, numbers, dots, underscores, or hyphens without repeated separators' })
  username?: string;

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
