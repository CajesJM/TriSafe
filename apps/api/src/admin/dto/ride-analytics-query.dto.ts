import { IsDateString, IsOptional, Matches } from 'class-validator';

export class RideAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must use YYYY-MM-DD format' })
  from?: string;

  @IsOptional()
  @IsDateString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must use YYYY-MM-DD format' })
  to?: string;
}
