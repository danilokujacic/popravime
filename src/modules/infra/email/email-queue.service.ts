import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmailJob } from './email.types';
import { EMAIL_QUEUE_NAME } from '../../../common/constants/di-tokens';

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
};

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue(EMAIL_QUEUE_NAME)
    private readonly queue: Queue<EmailJob>,
    @InjectPinoLogger(EmailQueueService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Enqueue(job: EmailJob): Promise<void> {
    await this.queue.add(job.kind, job, JOB_OPTIONS);

    this.logger.info(
      {
        emailKind: job.kind,
        to: job.payload.to,
        correlationId: job.correlationId,
      },
      'Email queued',
    );
  }
}
