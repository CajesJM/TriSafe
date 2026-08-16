import { Transform } from 'class-transformer';
import { UserStatus } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BoholAddressDto } from './bohol-address.dto';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const uppercaseText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const lowercaseText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDriverDto extends BoholAddressDto {
  @Transform(trimText)
  @IsString()
  @Length(5, 100)
  @Matches(/^[\p{L}][\p{L} '-]{1,44}, [\p{L}][\p{L}'-]+(?: [\p{L}][\p{L}'-]+)*(?: \p{L}\.)?$/u, {
    message: 'fullName must use Last Name, First Name M. format',
  })
  fullName!: string;

  @IsEnum(UserStatus)
  accountStatus!: UserStatus;

  @Transform(uppercaseText)
  @IsString()
  @Length(4, 30)
  @Matches(/^[A-Z0-9-]+$/, { message: 'licenseNumber may contain only letters, numbers, and hyphens' })
  licenseNumber!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'renewalDate must use YYYY-MM-DD format' })
  renewalDate!: string;

  @Transform(uppercaseText)
  @IsString()
  @Length(4, 40)
  @Matches(/^[A-Z0-9-]+$/, { message: 'franchiseNumber may contain only letters, numbers, and hyphens' })
  franchiseNumber!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'franchiseIssuedAt must use YYYY-MM-DD format' })
  franchiseIssuedAt!: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'franchiseExpiresAt must use YYYY-MM-DD format' })
  franchiseExpiresAt!: string;

  @Transform(uppercaseText)
  @IsString()
  @Length(3, 15)
  @Matches(/^[A-Z0-9-]+$/, { message: 'plateNumber may contain only letters, numbers, and hyphens' })
  plateNumber!: string;

  @Transform(uppercaseText)
  @IsIn(['TRICYCLE', 'HABAL_HABAL'])
  vehicleType!: 'TRICYCLE' | 'HABAL_HABAL';

  @IsString()
  @Matches(/^\+639\d{9}$/, { message: 'phone must be a Philippine mobile number in +639XXXXXXXXX format' })
  phone!: string;

  @Transform(lowercaseText)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'temporaryPassword must include uppercase, lowercase, number, and symbol',
  })
  temporaryPassword!: string;

}
