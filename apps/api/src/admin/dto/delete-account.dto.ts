import { IsIn, IsOptional, IsString } from "class-validator";

export class DeleteAccountDto {
  @IsOptional()
  @IsString()
  @IsIn(["DELETE"])
  confirmation?: string;
}
