import { IsLatitude, IsLongitude, IsOptional, IsString, IsInt, Max, Min, MinLength } from 'class-validator';

export class StartRideDto {
  @IsString() vehicleId!: string;
  @IsString() fromLocationId!: string;
  @IsString() toLocationId!: string;
  @IsOptional() @IsInt() @Min(1) passengerCount = 1;
  @IsOptional() @IsLatitude() startLatitude?: number;
  @IsOptional() @IsLongitude() startLongitude?: number;
}

export class StartMapRideDto {
  @IsString() @MinLength(1) vehicleId!: string;
  @IsString() @MinLength(1) qrToken!: string;
  @IsLatitude() originLatitude!: number;
  @IsLongitude() originLongitude!: number;
  @IsLatitude() destinationLatitude!: number;
  @IsLongitude() destinationLongitude!: number;
  @IsOptional() @IsInt() @Min(1) @Max(8) passengerCount = 1;
}

export class EndRideDto {
  @IsOptional() @IsLatitude() endLatitude?: number;
  @IsOptional() @IsLongitude() endLongitude?: number;
}
