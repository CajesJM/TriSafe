import { IsDateString, IsOptional } from 'class-validator';

export class RideHistoryQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
