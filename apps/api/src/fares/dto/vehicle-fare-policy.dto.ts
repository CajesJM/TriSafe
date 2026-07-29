import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
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
  @IsString()
  vehicleId!: string;

  @IsNumber()
  @Min(0)
  distanceMeters!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  passengerCount = 1;
}
