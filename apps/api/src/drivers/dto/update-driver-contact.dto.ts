import { IsEmail, IsPhoneNumber } from 'class-validator';

export class UpdateDriverContactDto {
  @IsPhoneNumber('PH') phone!: string;
  @IsEmail() email!: string;
}
