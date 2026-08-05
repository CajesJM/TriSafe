import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const SUPPORTED_VEHICLE_TYPES = ['TRICYCLE', 'HABAL_HABAL'] as const;

export class SaveVehicleFarePolicyDto {
  @IsIn(SUPPORTED_VEHICLE_TYPES)
  vehicleType!: (typeof SUPPORTED_VEHICLE_TYPES)[number];

  @IsNumber()
  @Min(0)
  baseFare!: number;

  @IsNumber()
  @Min(0)
  ratePerKm!: number;

  @IsNumber()
  @Min(0)
  minimumFare!: number;

  @IsNumber()
  @Min(0)
  passengerSurcharge!: number;

  @IsString()
  version!: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class DistanceFareEstimateDto {
  @IsIn(SUPPORTED_VEHICLE_TYPES)
  vehicleType!: (typeof SUPPORTED_VEHICLE_TYPES)[number];

  @IsLatitude()
  originLatitude!: number;

  @IsLongitude()
  originLongitude!: number;

  @IsLatitude()
  destinationLatitude!: number;

  @IsLongitude()
  destinationLongitude!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  passengerCount = 1;
}
