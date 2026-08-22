import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailProvider } from './email.provider';
import { EmailProcessor } from './email.processor';
import { EmailQueueService } from './email-queue.service';
import { EMAIL_QUEUE_NAME } from '../../../common/constants/di-tokens';

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE_NAME })],
  providers: [EmailProvider, EmailProcessor, EmailQueueService],
  exports: [EmailQueueService],
})
export class EmailModule {}
