import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PASSENGER_FARE_TYPES } from '@trisafe/contracts';
import type { PassengerFareType } from '@trisafe/contracts';

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
  @Max(100)
  studentDiscountPercent!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  seniorDiscountPercent!: number;

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

  @IsOptional()
  @IsIn(PASSENGER_FARE_TYPES)
  passengerType: PassengerFareType = 'REGULAR';

  @IsLatitude()
  originLatitude!: number;

  @IsLongitude()
  originLongitude!: number;

  @IsLatitude()
  destinationLatitude!: number;

  @IsLongitude()
  destinationLongitude!: number;
}
