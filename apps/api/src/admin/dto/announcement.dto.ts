import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() body!: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsString() @MaxLength(2800000)
  @Matches(/^data:image\/(?:jpeg|jpg|png|webp);base64,/i, { message: 'imageData must be a JPG, PNG, or WebP image' })
  imageData?: string;
}
