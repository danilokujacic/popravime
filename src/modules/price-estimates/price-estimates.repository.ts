import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceEstimate } from './entities/price-estimate.entity';
import { ListPriceEstimatesFilter } from './price-estimates.types';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class PriceEstimatesRepository {
  constructor(
    @InjectRepository(PriceEstimate)
    private readonly repository: Repository<PriceEstimate>,
  ) {}

  List(filter: ListPriceEstimatesFilter): Promise<PriceEstimate[]> {
    return this.repository.find({
      where: { categoryId: filter.categoryId },
      order: { serviceType: 'ASC' },
    });
  }

  FindById(id: string): Promise<PriceEstimate | null> {
    return this.repository.findOne({ where: { id } });
  }

  async Create(estimate: Partial<PriceEstimate>): Promise<PriceEstimate> {
    try {
      const entity = this.repository.create(estimate);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(estimate: PriceEstimate): Promise<PriceEstimate> {
    try {
      return await this.repository.save(estimate);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
