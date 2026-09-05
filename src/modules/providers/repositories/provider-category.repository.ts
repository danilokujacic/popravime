import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderCategory } from '../entities/provider-category.entity';
import { VerificationStatus } from '../providers.types';

@Injectable()
export class ProviderCategoryRepository {
  constructor(
    @InjectRepository(ProviderCategory)
    private readonly repository: Repository<ProviderCategory>,
  ) {}

  async ReplaceForProvider(
    providerId: string,
    categoryIds: string[],
  ): Promise<void> {
    await this.repository.delete({ providerId });

    if (categoryIds.length === 0) {
      return;
    }

    const rows = categoryIds.map((categoryId) =>
      this.repository.create({ providerId, categoryId }),
    );
    await this.repository.save(rows);
  }

  ListCategoryIds(providerId: string): Promise<ProviderCategory[]> {
    return this.repository.find({ where: { providerId } });
  }

  async ListCategoryIdsForOwner(ownerUserId: string): Promise<string[]> {
    const rows = await this.repository
      .createQueryBuilder('providerCategory')
      .innerJoin('providerCategory.provider', 'provider')
      .where('provider.ownerUserId = :ownerUserId', { ownerUserId })
      .andWhere('provider.verificationStatus = :verificationStatus', {
        verificationStatus: VerificationStatus.Verified,
      })
      .select('providerCategory.categoryId', 'categoryId')
      .getRawMany<{ categoryId: string }>();
    return rows.map((row) => row.categoryId);
  }
}
