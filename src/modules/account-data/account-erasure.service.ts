import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AccountErasureRepository } from './account-erasure.repository';
import { IAccountErasureService } from './account-erasure.service.interface';
import { AccountRevocationService } from '../auth/account-revocation.service';
import { RecentAuthenticationService } from '../auth/recent-authentication.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { jwtConfig } from '../../config/jwt.config';
import { StorageCleanupService } from '../infra/storage/storage-cleanup.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';

@Injectable()
export class AccountErasureService implements IAccountErasureService {
  constructor(
    private readonly accountErasureRepository: AccountErasureRepository,
    private readonly accountRevocationService: AccountRevocationService,
    private readonly recentAuthenticationService: RecentAuthenticationService,
    private readonly auditLogsService: AuditLogsService,
    private readonly storageCleanupService: StorageCleanupService,
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
    @InjectPinoLogger(AccountErasureService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Erase(user: AuthenticatedUser): Promise<void> {
    this.recentAuthenticationService.Ensure(user);
    this.EnsureErasable(user);
    await this.EnsureNoActiveWork(user.id);
    await this.EraseAccount(user.id, 'account.erased');
  }

  async EraseInactive(userId: string): Promise<boolean> {
    const hasActiveWork =
      await this.accountErasureRepository.HasActiveWork(userId);
    if (hasActiveWork) {
      this.logger.info({ userId }, 'Inactive account kept: active work');
      return false;
    }

    await this.EraseAccount(userId, 'account.erased_inactive');
    return true;
  }

  private async EraseAccount(userId: string, action: string): Promise<void> {
    const fileUrls = await this.accountErasureRepository.Erase(userId);
    await this.accountRevocationService.Revoke(
      userId,
      this.jwt.refreshExpiresInSeconds,
    );
    await this.auditLogsService.Log({
      actorId: userId,
      action,
      entityType: 'user',
      entityId: userId,
    });

    const failedDeletions =
      await this.storageCleanupService.DeleteByUrls(fileUrls);
    this.logger.info(
      { userId, action, files: fileUrls.length, failedDeletions },
      'Account erased',
    );
  }

  private EnsureErasable(user: AuthenticatedUser): void {
    if (user.role === UserRole.Admin) {
      this.logger.warn({ userId: user.id }, 'Admin account erasure rejected');
      throw new DomainForbiddenException(
        'ADMIN_ACCOUNT_NOT_ERASABLE',
        'Admin accounts cannot be erased through this endpoint',
      );
    }
  }

  private async EnsureNoActiveWork(userId: string): Promise<void> {
    const hasActiveWork =
      await this.accountErasureRepository.HasActiveWork(userId);
    if (hasActiveWork) {
      this.logger.warn({ userId }, 'Account erasure blocked by active work');
      throw new DomainConflictException(
        'ACCOUNT_HAS_ACTIVE_WORK',
        'Finish or cancel your accepted requests and offers before deleting your account',
      );
    }
  }
}
