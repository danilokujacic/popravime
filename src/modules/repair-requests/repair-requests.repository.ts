import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RepairRequest } from './entities/repair-request.entity';
import {
  ListRepairRequestsFilter,
  RequestStatus,
} from './repair-requests.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class RepairRequestsRepository {
  constructor(
    @InjectRepository(RepairRequest)
    private readonly repository: Repository<RepairRequest>,
  ) {}

  async List(
    filter: ListRepairRequestsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<RepairRequest>> {
    const query = this.repository
      .createQueryBuilder('request')
      .where(
        '(:status::text IS NULL OR request.status = :status::request_status_enum)',
        {
          status: filter.status ?? null,
        },
      )
      .andWhere('(:cityId::uuid IS NULL OR request.cityId = :cityId)', {
        cityId: filter.cityId ?? null,
      })
      .andWhere(
        '(:categoryId::uuid IS NULL OR request.categoryId = :categoryId)',
        {
          categoryId: filter.categoryId ?? null,
        },
      )
      .andWhere(
        '(:customerId::uuid IS NULL OR request.customerId = :customerId)',
        {
          customerId: filter.customerId ?? null,
        },
      )
      .andWhere(
        '(:urgency::text IS NULL OR request.urgency = :urgency::urgency_enum)',
        {
          urgency: filter.urgency ?? null,
        },
      )
      .orderBy('request.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  FindById(id: string): Promise<RepairRequest | null> {
    return this.repository.findOne({ where: { id } });
  }

  async Create(request: Partial<RepairRequest>): Promise<RepairRequest> {
    try {
      const entity = this.repository.create(request);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(request: RepairRequest): Promise<RepairRequest> {
    try {
      return await this.repository.save(request);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async CountByStatus(): Promise<Record<RequestStatus, number>> {
    const rows = await this.repository
      .createQueryBuilder('request')
      .select('request.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('request.status')
      .getRawMany<{ status: RequestStatus; count: string }>();

    const counts = BuildEmptyStatusCounts();
    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }
    return counts;
  }
}

function BuildEmptyStatusCounts(): Record<RequestStatus, number> {
  return {
    [RequestStatus.Open]: 0,
    [RequestStatus.OffersReceived]: 0,
    [RequestStatus.Accepted]: 0,
    [RequestStatus.InProgress]: 0,
    [RequestStatus.Completed]: 0,
    [RequestStatus.Cancelled]: 0,
  };
}
