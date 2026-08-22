import { Injectable } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { Category } from './entities/category.entity';
import { ListCategoriesFilter } from './categories.types';
import { ICategoriesService } from './categories.service.interface';
import { CacheService } from '../infra/cache/cache.service';
import { CACHE_KEYS } from '../infra/cache/cache-keys.constants';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

const CATEGORIES_CACHE_TTL_SECONDS = 3600;

function BuildListCacheKey(filter: ListCategoriesFilter): string {
  return `${CACHE_KEYS.CATEGORIES_LIST}:${filter.parentCategoryId ?? '*'}`;
}

@Injectable()
export class CategoriesService implements ICategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly cacheService: CacheService,
  ) {}

  List(filter: ListCategoriesFilter): Promise<Category[]> {
    return this.cacheService.GetOrSet(
      BuildListCacheKey(filter),
      () => this.categoriesRepository.List(filter),
      CATEGORIES_CACHE_TTL_SECONDS,
    );
  }

  async FindById(id: string): Promise<Category> {
    const category = await this.categoriesRepository.FindById(id);
    if (!category) {
      throw new DomainNotFoundException('CATEGORY_NOT_FOUND', 'Category not found');
    }
    return category;
  }
}
