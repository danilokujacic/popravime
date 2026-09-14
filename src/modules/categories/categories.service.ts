import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  CategoriesRepository,
  CategoryWithProviderCount,
} from './categories.repository';
import { Category } from './entities/category.entity';
import { ListCategoriesFilter } from './categories.types';
import { ICategoriesService } from './categories.service.interface';
import { CacheService } from '../infra/cache/cache.service';
import { CACHE_KEYS } from '../infra/cache/cache-keys.constants';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { EligibleStatuses } from '../providers/providers.types';
import { verificationConfig } from '../../config/verification.config';

const CATEGORIES_CACHE_TTL_SECONDS = 3600;
// Counts move whenever a provider is created/verified/deleted — a much shorter TTL than the
// category list itself (which barely ever changes), so the landing page's provider counts don't
// drift stale for a full hour while still sparing the grouped COUNT query on every request.
const CATEGORIES_WITH_COUNTS_CACHE_TTL_SECONDS = 300;

function BuildListCacheKey(filter: ListCategoriesFilter): string {
  return `${CACHE_KEYS.CATEGORIES_LIST}:${filter.parentCategoryId ?? '*'}`;
}

@Injectable()
export class CategoriesService implements ICategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly cacheService: CacheService,
    @Inject(verificationConfig.KEY)
    private readonly verification: ConfigType<typeof verificationConfig>,
  ) {}

  List(filter: ListCategoriesFilter): Promise<Category[]> {
    return this.cacheService.GetOrSet(
      BuildListCacheKey(filter),
      () => this.categoriesRepository.List(filter),
      CATEGORIES_CACHE_TTL_SECONDS,
    );
  }

  /** Same `verified`-only (or `verified`+`pending`, per `VERIFICATION_REQUIRED`) eligibility
   * rule the public `GET /providers` directory itself filters by (provider.repository.ts's
   * `List`) — a category's count here always matches what actually shows up if you filtered the
   * directory to that category. */
  ListWithProviderCounts(): Promise<CategoryWithProviderCount[]> {
    return this.cacheService.GetOrSet(
      CACHE_KEYS.CATEGORIES_WITH_COUNTS,
      () =>
        this.categoriesRepository.ListWithProviderCounts(
          EligibleStatuses(this.verification.required),
        ),
      CATEGORIES_WITH_COUNTS_CACHE_TTL_SECONDS,
    );
  }

  async FindById(id: string): Promise<Category> {
    const category = await this.categoriesRepository.FindById(id);
    if (!category) {
      throw new DomainNotFoundException(
        'CATEGORY_NOT_FOUND',
        'Category not found',
      );
    }
    return category;
  }
}
