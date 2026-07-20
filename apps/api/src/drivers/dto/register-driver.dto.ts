import { IsDateString, IsEmail, IsNotEmpty, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterDriverDto {
  @IsString() @IsNotEmpty() fullName!: string;
  @IsString() @IsNotEmpty() licenseNumber!: string;
  @IsDateString() renewalDate!: string;
  @IsString() @IsNotEmpty() franchiseNumber!: string;
  @IsDateString() franchiseIssuedAt!: string;
  @IsDateString() franchiseExpiresAt!: string;
  @IsString() @IsNotEmpty() plateNumber!: string;
  @IsString() @IsNotEmpty() vehicleType!: string;
  @IsPhoneNumber('PH') phone!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) temporaryPassword!: string;
}
