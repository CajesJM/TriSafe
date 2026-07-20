import { IsLatitude, IsLongitude, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class StartRideDto {
  @IsString() vehicleId!: string;
  @IsString() fromLocationId!: string;
  @IsString() toLocationId!: string;
  @IsOptional() @IsInt() @Min(1) passengerCount = 1;
  @IsOptional() @IsLatitude() startLatitude?: number;
  @IsOptional() @IsLongitude() startLongitude?: number;
}

export class EndRideDto {
  @IsOptional() @IsLatitude() endLatitude?: number;
  @IsOptional() @IsLongitude() endLongitude?: number;
}
