import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { retentionConfig } from '../../config/retention.config';
import {
  RETENTION_QUEUE_NAME,
  RETENTION_SCHEDULER_ID,
} from '../../common/constants/di-tokens';

@Injectable()
export class RetentionScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(RETENTION_QUEUE_NAME) private readonly queue: Queue,
    @Inject(retentionConfig.KEY)
    private readonly config: ConfigType<typeof retentionConfig>,
    @InjectPinoLogger(RetentionScheduler.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queue.upsertJobScheduler(
      RETENTION_SCHEDULER_ID,
      { pattern: this.config.schedulePattern },
      {
        name: 'purge',
        opts: { removeOnComplete: true, removeOnFail: 20 },
      },
    );

    this.logger.info(
      { pattern: this.config.schedulePattern },
      'Retention purge scheduled',
    );
  }
}
