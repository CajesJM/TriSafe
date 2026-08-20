import { IsPhoneNumber } from 'class-validator';

export class UpdateDriverContactDto {
  @IsPhoneNumber('PH') phone!: string;
}
