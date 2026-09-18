import { AccountErasureService } from './account-erasure.service';
import { AccountErasureRepository } from './account-erasure.repository';
import { AccountRevocationService } from '../auth/account-revocation.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { StorageCleanupService } from '../infra/storage/storage-cleanup.service';
import { UserRole } from '../users/users.types';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';

function BuildUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'ana@example.com',
    role: UserRole.Customer,
    ...overrides,
  };
}

function BuildService(overrides?: { hasActiveWork?: boolean }) {
  const accountErasureRepository = {
    HasActiveWork: jest
      .fn()
      .mockResolvedValue(overrides?.hasActiveWork ?? false),
    Erase: jest.fn().mockResolvedValue(['https://files/a.jpg']),
  } as unknown as AccountErasureRepository;
  const accountRevocationService = {
    Revoke: jest.fn().mockResolvedValue(undefined),
  } as unknown as AccountRevocationService;
  const auditLogsService = {
    Log: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditLogsService;
  const storageCleanupService = {
    DeleteByUrls: jest.fn().mockResolvedValue(0),
  } as unknown as StorageCleanupService;
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as ConstructorParameters<typeof AccountErasureService>[5];

  const service = new AccountErasureService(
    accountErasureRepository,
    accountRevocationService,
    auditLogsService,
    storageCleanupService,
    {
      accessSecret: 'a',
      accessExpiresInSeconds: 900,
      refreshSecret: 'r',
      refreshExpiresInSeconds: 604800,
    },
    logger,
  );

  return {
    service,
    accountErasureRepository,
    accountRevocationService,
    auditLogsService,
    storageCleanupService,
  };
}

describe('AccountErasureService.Erase', () => {
  it('erases the account, revokes its tokens, audits it and deletes the files', async () => {
    const {
      service,
      accountErasureRepository,
      accountRevocationService,
      auditLogsService,
      storageCleanupService,
    } = BuildService();

    await service.Erase(BuildUser());

    expect(accountErasureRepository.Erase).toHaveBeenCalledWith('user-1');
    expect(accountRevocationService.Revoke).toHaveBeenCalledWith(
      'user-1',
      604800,
    );
    expect(auditLogsService.Log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account.erased',
        entityId: 'user-1',
      }),
    );
    expect(storageCleanupService.DeleteByUrls).toHaveBeenCalledWith([
      'https://files/a.jpg',
    ]);
  });

  it('refuses to erase an admin account', async () => {
    const { service, accountErasureRepository } = BuildService();

    await expect(
      service.Erase(BuildUser({ role: UserRole.Admin })),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(accountErasureRepository.Erase).not.toHaveBeenCalled();
  });

  it('refuses to erase while accepted work is in progress', async () => {
    const { service, accountErasureRepository, accountRevocationService } =
      BuildService({ hasActiveWork: true });

    await expect(service.Erase(BuildUser())).rejects.toBeInstanceOf(
      DomainConflictException,
    );
    expect(accountErasureRepository.Erase).not.toHaveBeenCalled();
    expect(accountRevocationService.Revoke).not.toHaveBeenCalled();
  });

  it('erases an inactive account and records why', async () => {
    const { service, accountErasureRepository, auditLogsService } =
      BuildService();

    const erased = await service.EraseInactive('user-9');

    expect(erased).toBe(true);
    expect(accountErasureRepository.Erase).toHaveBeenCalledWith('user-9');
    expect(auditLogsService.Log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'account.erased_inactive',
        entityId: 'user-9',
      }),
    );
  });

  it('keeps an inactive account that still has accepted work', async () => {
    const { service, accountErasureRepository } = BuildService({
      hasActiveWork: true,
    });

    const erased = await service.EraseInactive('user-9');

    expect(erased).toBe(false);
    expect(accountErasureRepository.Erase).not.toHaveBeenCalled();
  });
});
