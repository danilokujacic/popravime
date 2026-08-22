import { Expose } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Urgency } from '../repair-requests.types';

export class CreateRepairRequestDto {
  @IsUUID()
  @Expose({ name: 'category_id' })
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description: string;

  @IsUUID()
  @Expose({ name: 'city_id' })
  cityId: string;

  @IsEnum(Urgency)
  urgency: Urgency;
}
