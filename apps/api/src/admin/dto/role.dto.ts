import { UserRole } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRoleDto {
  @IsEnum(UserRole)
  key!: UserRole;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  permissions!: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
