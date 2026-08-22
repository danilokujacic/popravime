import { Expose } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { WorkingHours } from '../providers.types';

export class CreateProviderDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Expose({ name: 'business_name' })
  businessName: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  address: string;

  @IsUUID()
  @Expose({ name: 'city_id' })
  cityId: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  @Expose({ name: 'category_ids' })
  categoryIds: string[];
}
