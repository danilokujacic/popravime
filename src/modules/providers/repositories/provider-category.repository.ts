import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderCategory } from '../entities/provider-category.entity';

@Injectable()
export class ProviderCategoryRepository {
  constructor(
    @InjectRepository(ProviderCategory)
    private readonly repository: Repository<ProviderCategory>,
  ) {}

  async ReplaceForProvider(providerId: string, categoryIds: string[]): Promise<void> {
    await this.repository.delete({ providerId });

    if (categoryIds.length === 0) {
      return;
    }

    const rows = categoryIds.map((categoryId) => this.repository.create({ providerId, categoryId }));
    await this.repository.save(rows);
  }

  ListCategoryIds(providerId: string): Promise<ProviderCategory[]> {
    return this.repository.find({ where: { providerId } });
  }
}
