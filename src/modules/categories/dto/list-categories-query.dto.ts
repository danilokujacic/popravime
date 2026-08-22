import { Expose } from 'class-transformer';
import { IsOptional, IsUUID } from 'class-validator';

export class ListCategoriesQueryDto {
  @IsOptional()
  @IsUUID()
  @Expose({ name: 'parent_category_id' })
  parentCategoryId?: string;
}
