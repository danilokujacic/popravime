import { Expose } from 'class-transformer';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Expose({ name: 'full_name' })
  fullName?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
