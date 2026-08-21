import { OffenseLevel, PenaltyStatus, ViolationStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateViolationDto {
  @IsString() driverId!: string;
  @IsString() @MaxLength(80) category!: string;
  @IsEnum(OffenseLevel) offenseLevel!: OffenseLevel;
  @IsString() @MaxLength(2000) description!: string;
  @IsDateString() occurredAt!: string;
  @IsOptional() @IsNumber() @Min(0) penaltyAmount?: number;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateViolationDto {
  @IsOptional() @IsEnum(OffenseLevel) offenseLevel?: OffenseLevel;
  @IsOptional() @IsEnum(ViolationStatus) status?: ViolationStatus;
  @IsOptional() @IsEnum(PenaltyStatus) penaltyStatus?: PenaltyStatus;
  @IsOptional() @IsNumber() @Min(0) penaltyAmount?: number | null;
  @IsOptional() @IsDateString() dueAt?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
}
