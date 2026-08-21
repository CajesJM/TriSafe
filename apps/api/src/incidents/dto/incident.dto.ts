import { IncidentCategory, IncidentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class DraftIncidentDto {
  @IsString() @MinLength(10) rawDescription!: string;
  @IsOptional() @IsString() rideId?: string;
  @IsOptional() @IsEnum(IncidentCategory) category?: IncidentCategory;
  @IsOptional() @IsString() @MaxLength(2_800_000) @Matches(/^data:image\/(?:jpeg|jpg|png|webp);base64,/i, { message: 'Evidence must be a JPG, PNG, or WebP image.' }) evidenceData?: string;
  @IsOptional() @IsString() @MaxLength(120) evidenceName?: string;
}

export class SubmitIncidentDto {
  @IsOptional() @IsString() @MinLength(10) @MaxLength(4000) finalDescription?: string;
  @IsOptional() @IsEnum(IncidentCategory) category?: IncidentCategory;
}

export class ReviewIncidentDto {
  @IsEnum(IncidentStatus) status!: IncidentStatus;
  @IsOptional() @IsEnum(IncidentCategory) category?: IncidentCategory;
  @IsOptional() @IsString() reviewerNotes?: string;
}
