import { Transform, Type } from 'class-transformer';
import { UserStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf, ValidateNested } from 'class-validator';
import { DriverPresentAddressDto } from './driver-present-address.dto';

const trimText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const uppercaseText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value;
const personPart = /^[\p{L}][\p{L} .'-]*$/u;
const recordNumber = /^[A-Z0-9-]+$/;

export class RegisterDriverDto {
  @Transform(trimText) @IsString() @Length(1, 60) @Matches(personPart) ownerLastName!: string;
  @Transform(trimText) @IsString() @Length(1, 60) @Matches(personPart) ownerFirstName!: string;
  @IsOptional() @Transform(trimText) @IsString() @MaxLength(60) @Matches(personPart) ownerMiddleName?: string;
  @Transform(trimText) @IsString() @Length(1, 60) @Matches(personPart) driverLastName!: string;
  @Transform(trimText) @IsString() @Length(1, 60) @Matches(personPart) driverFirstName!: string;
  @IsOptional() @Transform(trimText) @IsString() @MaxLength(60) @Matches(personPart) driverMiddleName?: string;
  @IsEnum(UserStatus) accountStatus!: UserStatus;
  @Transform(uppercaseText) @IsIn(['TRICYCLE', 'HABAL_HABAL']) vehicleType!: 'TRICYCLE' | 'HABAL_HABAL';
  @ValidateIf((value: RegisterDriverDto) => value.vehicleType === 'TRICYCLE')
  @Transform(uppercaseText) @IsString() @Length(2, 30) @Matches(recordNumber) bodyNumber?: string;
  @ValidateIf((value: RegisterDriverDto) => value.vehicleType === 'HABAL_HABAL')
  @Transform(uppercaseText) @IsString() @Length(2, 30) @Matches(recordNumber) permitNumber?: string;
  @Transform(uppercaseText) @IsString() @Length(3, 50) @Matches(recordNumber) engineNumber!: string;
  @Transform(uppercaseText) @IsString() @Length(3, 50) @Matches(recordNumber) chassisNumber!: string;
  @Transform(uppercaseText) @IsString() @Length(3, 15) @Matches(recordNumber) plateNumber!: string;
  @IsString() @Matches(/^\+639\d{9}$/, { message: 'phone must be a Philippine mobile number in +639XXXXXXXXX format' }) phone!: string;
  @IsOptional() @IsString() @MaxLength(2800000)
  @Matches(/^data:image\/(?:jpeg|jpg|png|webp);base64,/i, { message: 'avatarData must be a JPG, PNG, or WebP image' })
  avatarData?: string;
  @ValidateNested() @Type(() => DriverPresentAddressDto) address!: DriverPresentAddressDto;
  @Transform(uppercaseText) @IsString() @Length(4, 40) @Matches(recordNumber) franchiseNumber!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) franchiseIssuedAt!: string;
  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) franchiseExpiresAt!: string;
}
