import { Category } from '../entities/category.entity';
import { CategoryResponseDto } from '../dto/category-response.dto';

export class CategoryResponseMapper {
  static ToDto(this: void, category: Category): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.name = category.name;
    dto.slug = category.slug;
    dto.iconUrl = category.iconUrl;
    dto.parentCategoryId = category.parentCategoryId;
    return dto;
  }
}
