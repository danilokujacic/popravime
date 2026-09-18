import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RetentionProcessor } from './retention.processor';
import { RetentionRepository } from './retention.repository';
import { RetentionScheduler } from './retention.scheduler';
import { RetentionService } from './retention.service';
import { StorageModule } from '../infra/storage/storage.module';
import { AccountDataModule } from '../account-data/account-data.module';
import { RETENTION_QUEUE_NAME } from '../../common/constants/di-tokens';

@Module({
  imports: [
    BullModule.registerQueue({ name: RETENTION_QUEUE_NAME }),
    StorageModule,
    AccountDataModule,
  ],
  providers: [
    RetentionRepository,
    RetentionService,
    RetentionProcessor,
    RetentionScheduler,
  ],
})
export class RetentionModule {}
