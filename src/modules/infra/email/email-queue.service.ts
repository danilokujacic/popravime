import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmailAdmission, EmailJob } from './email.types';
import { EmailAdmissionService } from './email-admission.service';
import { CRITICAL_EMAIL_KINDS } from './critical-email-kinds';
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
    private readonly admissionService: EmailAdmissionService,
    @InjectPinoLogger(EmailQueueService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Enqueue(job: EmailJob): Promise<void> {
    const admission = await this.admissionService.Admit(job.kind);
    if (admission !== 'admitted') {
      this.LogDropped(job, admission);
      return;
    }

    await this.queue.add(job.kind, job, JOB_OPTIONS);

    this.logger.info(
      {
        emailKind: job.kind,
        correlationId: job.correlationId,
      },
      'Email queued',
    );
  }

  private LogDropped(
    job: EmailJob,
    admission: Exclude<EmailAdmission, 'admitted'>,
  ): void {
    const context = {
      emailKind: job.kind,
      correlationId: job.correlationId,
    };
    if (admission === 'disabled') {
      this.logger.warn(context, 'Email sending disabled, dropping email');
      return;
    }
    this.logger.warn(
      { ...context, critical: CRITICAL_EMAIL_KINDS.has(job.kind) },
      'Email daily limit reached, dropping email',
    );
  }
}
