import { IsBoolean, IsOptional, IsPhoneNumber, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SaveTrustedContactDto {
  @IsString() @MinLength(2) @MaxLength(100) fullName!: string;
  @IsString() @MinLength(2) @MaxLength(60) relationship!: string;
  @IsPhoneNumber('PH') @Matches(/^\+63\d{10}$/, { message: 'Phone number must contain +63 followed by exactly 10 digits.' }) phone!: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
