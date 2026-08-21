import { Type } from 'class-transformer';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { DriverPresentAddressDto } from './driver-present-address.dto';

export class UpdateDriverProfileDto {
  @IsOptional()
  @IsPhoneNumber('PH')
  phone?: string;

  /** A null value intentionally removes the existing private driver photo. */
  @IsOptional()
  @IsString()
  @MaxLength(2800000)
  @Matches(/^data:image\/(?:jpeg|jpg|png|webp);base64,/i, {
    message: 'avatarData must be a JPG, PNG, or WebP image',
  })
  avatarData?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => DriverPresentAddressDto)
  address?: DriverPresentAddressDto;
}
