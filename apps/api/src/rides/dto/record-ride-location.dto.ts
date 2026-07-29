import { IsLatitude, IsLongitude, IsNumber, IsOptional, Min } from 'class-validator';

export class RecordRideLocationDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  speed?: number;
}
