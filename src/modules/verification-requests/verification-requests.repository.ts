import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationRequest } from './entities/verification-request.entity';
import {
  ListVerificationRequestsFilter,
  VerificationRequestStatus,
} from './verification-requests.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class VerificationRequestsRepository {
  constructor(
    @InjectRepository(VerificationRequest)
    private readonly repository: Repository<VerificationRequest>,
  ) {}

  async List(
    filter: ListVerificationRequestsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<VerificationRequest>> {
    const [items, total] = await this.repository.findAndCount({
      where: { status: filter.status },
      order: { submittedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  FindById(id: string): Promise<VerificationRequest | null> {
    return this.repository.findOne({ where: { id } });
  }

  ExistsPending(providerId: string): Promise<boolean> {
    return this.repository.exists({
      where: { providerId, status: VerificationRequestStatus.Pending },
    });
  }

  async Create(
    request: Partial<VerificationRequest>,
  ): Promise<VerificationRequest> {
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

  async Save(request: VerificationRequest): Promise<VerificationRequest> {
    try {
      return await this.repository.save(request);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }
}
