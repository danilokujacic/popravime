import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CategoryWithCountResponseDto } from './dto/category-with-count-response.dto';
import { CategoryResponseMapper } from './mappers/category-response.mapper';
import { CategoryWithCountResponseMapper } from './mappers/category-with-count-response.mapper';
import { Public } from '../../common/decorators/public.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async List(
    @Query() query: ListCategoriesQueryDto,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.categoriesService.List({
      parentCategoryId: query.parentCategoryId,
    });
    return categories.map(CategoryResponseMapper.ToDto);
  }

  // Registered ahead of `:id` — otherwise Nest would match the literal segment "with-counts" as
  // a `:id` value and hand it to `FindOne`'s `ParseUUIDPipe`, which would reject it as an invalid
  // UUID (400) instead of ever reaching this handler.
  @Public()
  @Get('with-counts')
  async ListWithCounts(): Promise<CategoryWithCountResponseDto[]> {
    const categories = await this.categoriesService.ListWithProviderCounts();
    return categories.map(CategoryWithCountResponseMapper.ToDto);
  }

  @Public()
  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    const category = await this.categoriesService.FindById(id);
    return CategoryResponseMapper.ToDto(category);
  }
}
