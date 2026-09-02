import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DirectInquiry } from './entities/direct-inquiry.entity';
import { ListDirectInquiriesFilter } from './direct-inquiries.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class DirectInquiriesRepository {
  constructor(
    @InjectRepository(DirectInquiry)
    private readonly repository: Repository<DirectInquiry>,
  ) {}

  async List(
    filter: ListDirectInquiriesFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<DirectInquiry>> {
    const query = this.repository
      .createQueryBuilder('inquiry')
      .where('inquiry.providerId = :providerId', {
        providerId: filter.providerId,
      })
      .andWhere(
        '(:status::text IS NULL OR inquiry.status = :status::inquiry_status_enum)',
        {
          status: filter.status ?? null,
        },
      )
      .orderBy('inquiry.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  FindById(id: string): Promise<DirectInquiry | null> {
    return this.repository.findOne({ where: { id } });
  }

  async Create(inquiry: Partial<DirectInquiry>): Promise<DirectInquiry> {
    try {
      const entity = this.repository.create(inquiry);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(inquiry: DirectInquiry): Promise<DirectInquiry> {
    try {
      return await this.repository.save(inquiry);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }
}
