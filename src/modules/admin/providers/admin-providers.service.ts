import { Injectable } from '@nestjs/common';
import { IAdminProvidersService } from './admin-providers.service.interface';
import { ProvidersService } from '../../providers/providers.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { Provider } from '../../providers/entities/provider.entity';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

@Injectable()
export class AdminProvidersService implements IAdminProvidersService {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  List(
    approved: boolean | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Provider>> {
    return this.providersService.ListForAdmin({ approved }, page, limit);
  }

  async SetApproval(
    adminId: string,
    providerId: string,
    approved: boolean,
  ): Promise<Provider> {
    const provider = await this.providersService.SetApproved(
      providerId,
      approved,
    );
    await this.auditLogsService.Log({
      actorId: adminId,
      action: approved ? 'provider.approved' : 'provider.approval_revoked',
      entityType: 'provider',
      entityId: providerId,
    });
    return provider;
  }
}
