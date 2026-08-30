import { IsString } from 'class-validator';

export class FareEstimateDto {
  @IsString() fromLocationId!: string;
  @IsString() toLocationId!: string;
}
