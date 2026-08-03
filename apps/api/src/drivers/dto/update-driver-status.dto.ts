import { DriverVerificationStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, Length, ValidateIf } from 'class-validator';

export class UpdateDriverStatusDto {
  @IsEnum(DriverVerificationStatus)
  status!: DriverVerificationStatus;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value)
  @ValidateIf((object: UpdateDriverStatusDto) => object.status === DriverVerificationStatus.SUSPENDED)
  @IsString()
  @Length(10, 500)
  reason?: string;
}
