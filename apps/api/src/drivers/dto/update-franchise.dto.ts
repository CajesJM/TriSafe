import { DriverVerificationStatus } from '@prisma/client';
import { IsDateString, IsIn } from 'class-validator';

export class UpdateFranchiseDto {
  @IsIn([
    DriverVerificationStatus.VERIFIED,
    DriverVerificationStatus.SUSPENDED,
    DriverVerificationStatus.EXPIRED,
  ])
  status!: DriverVerificationStatus;
  @IsDateString() expiresAt!: string;
}
