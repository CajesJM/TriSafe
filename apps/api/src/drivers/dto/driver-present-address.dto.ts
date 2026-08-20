import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

const trimText = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

export class DriverPresentAddressDto {
  @IsString() @Matches(/^0701200000$/) provinceCode!: string;
  @Transform(trimText) @IsString() @Matches(/^Bohol$/i) provinceName!: string;
  @IsString() @Matches(/^07012\d{5}$/) municipalityCode!: string;
  @Transform(trimText) @IsString() @Length(2, 80) municipalityName!: string;
  @IsString() @Matches(/^07012\d{5}$/) barangayCode!: string;
  @Transform(trimText) @IsString() @Length(2, 100) @Matches(/^[^0-9]+$/) barangayName!: string;
  @Transform(trimText) @IsString() @Length(1, 100)
  @Matches(/^[\p{L}\p{N} .,'#/-]+$/u, { message: 'purok contains invalid characters' }) purok!: string;
}
