import { AuditLog } from './entities/audit-log.entity';
import { ListAuditLogsFilter, LogActionInput } from './audit-logs.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IAuditLogsService {
  Log(input: LogActionInput): Promise<void>;
  List(
    filter: ListAuditLogsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<AuditLog>>;
}
