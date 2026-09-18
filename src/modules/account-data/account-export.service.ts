import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AccountExportRepository } from './account-export.repository';
import { RecentAuthenticationService } from '../auth/recent-authentication.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { IAccountExportService } from './account-export.service.interface';
import { AccountExport } from './account-data.types';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

@Injectable()
export class AccountExportService implements IAccountExportService {
  constructor(
    private readonly accountExportRepository: AccountExportRepository,
    private readonly recentAuthenticationService: RecentAuthenticationService,
    @InjectPinoLogger(AccountExportService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Export(user: AuthenticatedUser): Promise<AccountExport> {
    this.recentAuthenticationService.Ensure(user);
    const data = await this.accountExportRepository.Collect(user.id);
    if (!data) {
      throw new DomainNotFoundException('USER_NOT_FOUND', 'User not found');
    }

    this.logger.info({ userId: user.id }, 'Account data exported');

    return { ...data, exportedAt: new Date() };
  }
}
