import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Matches(/^[^\s]+$/, { message: 'Login identifier must not contain spaces' })
  identifier!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
