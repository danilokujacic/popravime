import { AdminProvidersService } from './admin-providers.service';
import { ProvidersService } from '../../providers/providers.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { Provider } from '../../providers/entities/provider.entity';

function BuildService() {
  const providersService = {
    ListForAdmin: jest
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    SetApproved: jest
      .fn()
      .mockResolvedValue({ id: 'provider-1', approved: true } as Provider),
  } as unknown as ProvidersService;
  const auditLogsService = {
    Log: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditLogsService;

  return {
    service: new AdminProvidersService(providersService, auditLogsService),
    providersService,
    auditLogsService,
  };
}

describe('AdminProvidersService', () => {
  it('lists providers filtered by approval', async () => {
    const { service, providersService } = BuildService();

    await service.List(false, 1, 20);

    expect(providersService.ListForAdmin).toHaveBeenCalledWith(
      { approved: false },
      1,
      20,
    );
  });

  it('approves a provider and audit-logs who did it', async () => {
    const { service, providersService, auditLogsService } = BuildService();

    const provider = await service.SetApproval('admin-1', 'provider-1', true);

    expect(providersService.SetApproved).toHaveBeenCalledWith(
      'provider-1',
      true,
    );
    expect(provider.approved).toBe(true);
    expect(auditLogsService.Log).toHaveBeenCalledWith({
      actorId: 'admin-1',
      action: 'provider.approved',
      entityType: 'provider',
      entityId: 'provider-1',
    });
  });

  it('records a revoked approval under its own action', async () => {
    const { service, auditLogsService } = BuildService();

    await service.SetApproval('admin-1', 'provider-1', false);

    expect(auditLogsService.Log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'provider.approval_revoked' }),
    );
  });
});
