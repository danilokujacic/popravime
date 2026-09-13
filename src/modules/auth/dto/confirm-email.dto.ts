import { IsString, MinLength } from 'class-validator';

export class ConfirmEmailDto {
  @IsString()
  @MinLength(1)
  slug: string;
}
