import { IncidentCategory, IncidentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class DraftIncidentDto {
  @IsString() @MinLength(10) rawDescription!: string;
  @IsOptional() @IsString() rideId?: string;
}

export class ReviewIncidentDto {
  @IsEnum(IncidentStatus) status!: IncidentStatus;
  @IsOptional() @IsEnum(IncidentCategory) category?: IncidentCategory;
  @IsOptional() @IsString() reviewerNotes?: string;
}
