import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RetentionRepository } from './retention.repository';
import { IRetentionService } from './retention.service.interface';
import { PurgeCutoffs, PurgeSummary } from './retention.types';
import { retentionConfig } from '../../config/retention.config';
import { StorageCleanupService } from '../infra/storage/storage-cleanup.service';
import { AccountErasureService } from '../account-data/account-erasure.service';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function DaysBefore(now: Date, days: number): Date {
  return new Date(now.getTime() - days * MILLISECONDS_PER_DAY);
}

@Injectable()
export class RetentionService implements IRetentionService {
  constructor(
    private readonly retentionRepository: RetentionRepository,
    private readonly storageCleanupService: StorageCleanupService,
    private readonly accountErasureService: AccountErasureService,
    @Inject(retentionConfig.KEY)
    private readonly config: ConfigType<typeof retentionConfig>,
    @InjectPinoLogger(RetentionService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Purge(): Promise<PurgeSummary> {
    const cutoffs = this.BuildCutoffs(new Date());

    const inactiveAccounts = await this.PurgeInactiveAccounts(
      cutoffs.inactiveAccounts,
    );
    const requests = await this.retentionRepository.PurgeClosedRequests(
      cutoffs.completedRequests,
      cutoffs.unacceptedRequests,
      this.config.batchSize,
    );
    const inquiries = await this.retentionRepository.PurgeInquiries(
      cutoffs.inquiries,
      this.config.batchSize,
    );
    const contactMessages = await this.retentionRepository.PurgeContactMessages(
      cutoffs.contactMessages,
    );
    const expiredConfirmations =
      await this.retentionRepository.PurgeExpiredConfirmations();

    const fileUrls = [...requests.fileUrls, ...inquiries.fileUrls];
    const failedFileDeletions =
      await this.storageCleanupService.DeleteByUrls(fileUrls);

    const summary: PurgeSummary = {
      inactiveAccounts,
      requests: requests.records,
      inquiries: inquiries.records,
      contactMessages,
      expiredConfirmations,
      files: fileUrls.length,
      failedFileDeletions,
    };
    this.logger.info(summary, 'Retention purge finished');

    return summary;
  }

  private async PurgeInactiveAccounts(cutoff: Date): Promise<number> {
    const userIds = await this.retentionRepository.FindInactiveUserIds(
      cutoff,
      this.config.batchSize,
    );

    let erased = 0;
    for (const userId of userIds) {
      erased += await this.EraseOne(userId);
    }
    return erased;
  }

  private async EraseOne(userId: string): Promise<number> {
    try {
      const wasErased = await this.accountErasureService.EraseInactive(userId);
      return wasErased ? 1 : 0;
    } catch (error) {
      this.logger.error(
        {
          userId,
          message: error instanceof Error ? error.message : 'unknown error',
        },
        'Inactive account erasure failed',
      );
      return 0;
    }
  }

  private BuildCutoffs(now: Date): PurgeCutoffs {
    return {
      inactiveAccounts: DaysBefore(now, this.config.inactiveAccountsDays),
      completedRequests: DaysBefore(now, this.config.completedRequestsDays),
      unacceptedRequests: DaysBefore(now, this.config.unacceptedRequestsDays),
      inquiries: DaysBefore(now, this.config.inquiriesDays),
      contactMessages: DaysBefore(now, this.config.contactMessagesDays),
    };
  }
}
