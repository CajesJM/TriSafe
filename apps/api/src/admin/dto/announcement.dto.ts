import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() body!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
}
