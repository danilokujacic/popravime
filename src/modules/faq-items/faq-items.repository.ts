import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaqItem } from './entities/faq-item.entity';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class FaqItemsRepository {
  constructor(
    @InjectRepository(FaqItem)
    private readonly repository: Repository<FaqItem>,
  ) {}

  List(): Promise<FaqItem[]> {
    return this.repository.find({
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
  }

  FindById(id: string): Promise<FaqItem | null> {
    return this.repository.findOne({ where: { id } });
  }

  async Create(item: Partial<FaqItem>): Promise<FaqItem> {
    try {
      const entity = this.repository.create(item);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(item: FaqItem): Promise<FaqItem> {
    try {
      return await this.repository.save(item);
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
