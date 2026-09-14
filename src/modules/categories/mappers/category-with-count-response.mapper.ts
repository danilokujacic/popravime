import { CategoryWithProviderCount } from '../categories.repository';
import { CategoryWithCountResponseDto } from '../dto/category-with-count-response.dto';

export class CategoryWithCountResponseMapper {
  static ToDto(
    this: void,
    category: CategoryWithProviderCount,
  ): CategoryWithCountResponseDto {
    const dto = new CategoryWithCountResponseDto();
    dto.id = category.id;
    dto.slug = category.slug;
    dto.iconUrl = category.iconUrl;
    dto.parentCategoryId = category.parentCategoryId;
    dto.providerCount = category.providerCount;
    return dto;
  }
}
