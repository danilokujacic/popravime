import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryResponseMapper } from './mappers/category-response.mapper';
import { Public } from '../../common/decorators/public.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async List(@Query() query: ListCategoriesQueryDto): Promise<CategoryResponseDto[]> {
    const categories = await this.categoriesService.List({
      parentCategoryId: query.parentCategoryId,
    });
    return categories.map(CategoryResponseMapper.ToDto);
  }

  @Public()
  @Get(':id')
  async FindOne(@Param('id', ParseUUIDPipe) id: string): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.FindById(id);
    return CategoryResponseMapper.ToDto(category);
  }
}
