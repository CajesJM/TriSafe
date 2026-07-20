import { DriverVerificationStatus } from '@prisma/client';
import { IsDateString, IsEnum } from 'class-validator';

export class UpdateFranchiseDto {
  @IsEnum(DriverVerificationStatus) status!: DriverVerificationStatus;
  @IsDateString() expiresAt!: string;
}
