import { Expose } from 'class-transformer';
import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PartsType } from '../offers.types';

export class CreateOfferDto {
  @IsUUID()
  @Expose({ name: 'request_id' })
  requestId: string;

  @IsUUID()
  @Expose({ name: 'provider_id' })
  providerId: string;

  @IsNumberString()
  @Expose({ name: 'price_min' })
  priceMin: string;

  @IsNumberString()
  @Expose({ name: 'price_max' })
  priceMax: string;

  @IsString()
  @MaxLength(120)
  @Expose({ name: 'estimated_duration' })
  estimatedDuration: string;

  @IsEnum(PartsType)
  @Expose({ name: 'parts_type' })
  partsType: PartsType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
