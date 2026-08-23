import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditLog } from './entities/audit-log.entity';
import { ListAuditLogsFilter, LogActionInput } from './audit-logs.types';
import { IAuditLogsService } from './audit-logs.service.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class AuditLogsService implements IAuditLogsService {
  constructor(
    private readonly auditLogsRepository: AuditLogsRepository,
    @InjectPinoLogger(AuditLogsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Log(input: LogActionInput): Promise<void> {
    const log = await this.auditLogsRepository.Create({
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata ?? null,
    });

    this.logger.info(
      {
        auditLogId: log.id,
        action: input.action,
        entityType: input.entityType,
      },
      'Audit log recorded',
    );
  }

  List(
    filter: ListAuditLogsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AuditLog>> {
    return this.auditLogsRepository.List(filter, page, limit);
  }
}
