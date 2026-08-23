import { Expose } from 'class-transformer';
import {
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreatePriceEstimateDto {
  @IsUUID()
  @Expose({ name: 'category_id' })
  categoryId: string;

  @IsString()
  @MaxLength(120)
  @Expose({ name: 'service_type' })
  serviceType: string;

  @IsNumberString()
  @Expose({ name: 'price_min' })
  priceMin: string;

  @IsNumberString()
  @Expose({ name: 'price_max' })
  priceMax: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
