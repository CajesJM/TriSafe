import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class FareEstimateDto {
  @IsString() fromLocationId!: string;
  @IsString() toLocationId!: string;
  @IsOptional() @IsInt() @Min(1) passengerCount = 1;
}
