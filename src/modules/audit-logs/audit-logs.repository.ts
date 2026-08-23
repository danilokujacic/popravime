import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ListAuditLogsFilter } from './audit-logs.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class AuditLogsRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  async List(
    filter: ListAuditLogsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AuditLog>> {
    const query = this.repository
      .createQueryBuilder('log')
      .where('(:actorId::uuid IS NULL OR log.actorId = :actorId)', {
        actorId: filter.actorId ?? null,
      })
      .andWhere('(:entityType::text IS NULL OR log.entityType = :entityType)', {
        entityType: filter.entityType ?? null,
      })
      .andWhere('(:action::text IS NULL OR log.action = :action)', {
        action: filter.action ?? null,
      })
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    return { items, total, page, limit };
  }

  async Create(log: Partial<AuditLog>): Promise<AuditLog> {
    try {
      const entity = this.repository.create(log);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }
}
