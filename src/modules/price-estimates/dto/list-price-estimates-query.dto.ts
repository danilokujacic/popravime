import { Expose } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

export class ListPriceEstimatesQueryDto {
  @IsOptional()
  @IsUUID()
  @Expose({ name: 'category_id' })
  categoryId?: string;
}
