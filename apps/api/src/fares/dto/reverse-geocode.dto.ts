import { IsLatitude, IsLongitude } from 'class-validator';

export class ReverseGeocodeDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}
