import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveTermsDto {
  @IsString() @MaxLength(60) version!: string;
  @IsString() @MaxLength(160) title!: string;
  @IsString() @MaxLength(50000) content!: string;
  @IsOptional() @IsDateString() effectiveFrom?: string;
}
