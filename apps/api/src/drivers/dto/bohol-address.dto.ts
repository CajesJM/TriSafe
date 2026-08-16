import { Transform } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsString,
  Length,
  Matches,
} from 'class-validator';

const trimText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const uppercaseText = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class BoholAddressDto {
  @Transform(uppercaseText)
  @IsString()
  @Matches(/^0701200000$/, { message: 'provinceCode must identify Bohol' })
  provinceCode!: string;

  @Transform(trimText)
  @IsString()
  @Matches(/^Bohol$/i, { message: 'provinceName must be Bohol' })
  provinceName!: string;

  @IsString()
  @Matches(/^07012\d{5}$/, { message: 'municipalityCode must be a valid Bohol PSGC code' })
  municipalityCode!: string;

  @Transform(trimText)
  @IsString()
  @Length(2, 80)
  municipalityName!: string;

  @IsString()
  @Matches(/^07012\d{5}$/, { message: 'barangayCode must be a valid Bohol PSGC code' })
  barangayCode!: string;

  @Transform(trimText)
  @IsString()
  @Length(2, 100)
  @Matches(/^[^0-9]+$/, { message: 'barangayName must not contain numbers' })
  barangayName!: string;

  @Transform(trimText)
  @IsString()
  @Length(2, 140)
  streetPurok!: string;

  @IsString()
  @Matches(/^\d{4}$/, { message: 'postalCode must contain exactly four digits' })
  postalCode!: string;

  @IsString()
  @Matches(/^[NWR]\d+$/, { message: 'streetPlaceId must identify a verified map location' })
  streetPlaceId!: string;

  @IsLatitude()
  addressLatitude!: number;

  @IsLongitude()
  addressLongitude!: number;
}
