import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateRatingDto {
  @IsString() rideId!: string;
  @IsInt() @Min(1) @Max(5) score!: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

export class ModerateRatingDto {
  @IsBoolean() visible!: boolean;
  @IsOptional() @IsString() @MaxLength(1000) moderationNotes?: string;
}
