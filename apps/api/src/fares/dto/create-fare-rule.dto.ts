import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFareRuleDto {
  @IsString() fromLocationId!: string;
  @IsString() toLocationId!: string;
  @IsNumber() @Min(0) baseFare!: number;
  @IsNumber() @Min(0) distanceKm!: number;
  @IsNumber() @Min(0) perKm!: number;
  @IsNumber() @Min(0) minimumFare!: number;
  @IsString() version!: string;
  @IsDateString() effectiveFrom!: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
}
