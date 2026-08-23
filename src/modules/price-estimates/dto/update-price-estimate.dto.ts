import { Expose } from 'class-transformer';
import {
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePriceEstimateDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Expose({ name: 'service_type' })
  serviceType?: string;

  @IsOptional()
  @IsNumberString()
  @Expose({ name: 'price_min' })
  priceMin?: string;

  @IsOptional()
  @IsNumberString()
  @Expose({ name: 'price_max' })
  priceMax?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
