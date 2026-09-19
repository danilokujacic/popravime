import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import type { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { EmailProvider } from './email.provider';
import { EmailProcessor } from './email.processor';
import { EmailQueueService } from './email-queue.service';
import { EmailCooldownService } from './email-cooldown.service';
import { EmailAdmissionService } from './email-admission.service';
import {
  EMAIL_LIMIT_REDIS,
  EMAIL_QUEUE_NAME,
} from '../../../common/constants/di-tokens';
import { redisConfig } from '../../../config/redis.config';

@Module({
  imports: [BullModule.registerQueue({ name: EMAIL_QUEUE_NAME })],
  providers: [
    {
      provide: EMAIL_LIMIT_REDIS,
      inject: [redisConfig.KEY],
      useFactory: (redis: ConfigType<typeof redisConfig>): Redis =>
        new Redis({
          host: redis.host,
          port: redis.port,
          password: redis.password,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
        }),
    },
    EmailProvider,
    EmailProcessor,
    EmailQueueService,
    EmailCooldownService,
    EmailAdmissionService,
  ],
  exports: [EmailQueueService, EmailCooldownService],
})
export class EmailModule {}
