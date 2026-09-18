import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AccountExportRepository } from './account-export.repository';
import { IAccountExportService } from './account-export.service.interface';
import { AccountExport } from './account-data.types';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

@Injectable()
export class AccountExportService implements IAccountExportService {
  constructor(
    private readonly accountExportRepository: AccountExportRepository,
    @InjectPinoLogger(AccountExportService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Export(userId: string): Promise<AccountExport> {
    const data = await this.accountExportRepository.Collect(userId);
    if (!data) {
      throw new DomainNotFoundException('USER_NOT_FOUND', 'User not found');
    }

    this.logger.info({ userId }, 'Account data exported');

    return { ...data, exportedAt: new Date() };
  }
}
