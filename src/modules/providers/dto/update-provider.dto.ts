import { Expose } from 'class-transformer';
import { IsEmail, IsObject, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import type { WorkingHours } from '../providers.types';

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Expose({ name: 'business_name' })
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsObject()
  @Expose({ name: 'working_hours' })
  workingHours?: WorkingHours;
}
