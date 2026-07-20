import { DriverVerificationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateDriverStatusDto {
  @IsEnum(DriverVerificationStatus)
  status!: DriverVerificationStatus;
}
