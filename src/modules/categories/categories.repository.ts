import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { ListCategoriesFilter } from './categories.types';
import { VerificationStatus } from '../providers/providers.types';

/** Raw `getRawMany()` row shape for `ListWithProviderCounts` — TypeORM keeps each `addSelect`
 * alias verbatim (no camelCase inference like `find()`'s entity hydration), and `COUNT(...)`
 * comes back as a string over the pg driver, not a number. */
interface CategoryWithProviderCountRow {
  id: string;
  slug: string;
  iconUrl: string | null;
  parentCategoryId: string | null;
  providerCount: string;
}

export interface CategoryWithProviderCount {
  id: string;
  slug: string;
  iconUrl: string | null;
  parentCategoryId: string | null;
  providerCount: number;
}

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  List(filter: ListCategoriesFilter): Promise<Category[]> {
    return this.repository.find({
      where: { parentCategoryId: filter.parentCategoryId },
      order: { name: 'ASC' },
    });
  }

  FindById(id: string): Promise<Category | null> {
    return this.repository.findOne({ where: { id } });
  }

  /**
   * One grouped SQL query for every category's provider count — not N+1 per-category
   * `GET /providers?category_id=...` calls. `provider` is joined with the eligibility filter
   * baked into the join condition (not a `WHERE`) specifically so a category with zero eligible
   * providers still comes back with `providerCount: 0` instead of being dropped by an inner join/
   * post-filter; `COUNT(DISTINCT provider.id)` (not `pc.provider_id`) guards against double-
   * counting if a provider is ever linked to the same category twice.
   */
  async ListWithProviderCounts(
    eligibleStatuses: VerificationStatus[],
  ): Promise<CategoryWithProviderCount[]> {
    const rows = await this.repository
      .createQueryBuilder('category')
      .leftJoin('provider_categories', 'pc', 'pc.category_id = category.id')
      .leftJoin(
        'providers',
        'provider',
        'provider.id = pc.provider_id AND provider.verification_status = ANY(:eligibleStatuses)',
        { eligibleStatuses },
      )
      .select('category.id', 'id')
      .addSelect('category.slug', 'slug')
      .addSelect('category.iconUrl', 'iconUrl')
      .addSelect('category.parentCategoryId', 'parentCategoryId')
      .addSelect('COUNT(DISTINCT provider.id)', 'providerCount')
      .groupBy('category.id')
      .orderBy('category.name', 'ASC')
      .getRawMany<CategoryWithProviderCountRow>();

    return rows.map((row) => ({
      ...row,
      providerCount: Number.parseInt(row.providerCount, 10),
    }));
  }
}
