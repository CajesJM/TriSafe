import { UserRole, UserStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsIn, IsOptional, IsPhoneNumber, IsString, Length, Matches, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { DriverPresentAddressDto } from '../../drivers/dto/driver-present-address.dto';

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

const personPart = /^[\p{L}][\p{L} .'-]*$/u;
const recordNumber = /^[A-Z0-9-]+$/;

export class UpdateDriverRecordDto {
  @IsString() @Length(1, 60) @Matches(personPart) ownerLastName!: string;
  @IsString() @Length(1, 60) @Matches(personPart) ownerFirstName!: string;
  @IsOptional() @IsString() @MaxLength(60) @Matches(personPart) ownerMiddleName?: string;
  @IsIn(['TRICYCLE', 'HABAL_HABAL']) vehicleType!: 'TRICYCLE' | 'HABAL_HABAL';
  @ValidateIf((value: UpdateDriverRecordDto) => value.vehicleType === 'TRICYCLE')
  @IsString() @Length(2, 30) @Matches(recordNumber) bodyNumber?: string;
  @ValidateIf((value: UpdateDriverRecordDto) => value.vehicleType === 'HABAL_HABAL')
  @IsString() @Length(2, 30) @Matches(recordNumber) permitNumber?: string;
  @IsString() @Length(3, 50) @Matches(recordNumber) engineNumber!: string;
  @IsString() @Length(3, 50) @Matches(recordNumber) chassisNumber!: string;
  @IsString() @Length(3, 15) @Matches(recordNumber) plateNumber!: string;
  @ValidateNested() @Type(() => DriverPresentAddressDto) address!: DriverPresentAddressDto;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateDriverRecordDto)
  driverRecord?: UpdateDriverRecordDto;
}
