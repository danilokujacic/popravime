import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { EmailService } from './email.service.interface';
import { EmailJob } from './email.types';
import {
  EMAIL_QUEUE_NAME,
  EMAIL_SERVICE,
} from '../../../common/constants/di-tokens';
import { BuildWelcomeEmail } from './templates/welcome.template';
import { BuildOfferReceivedEmail } from './templates/offer-received.template';
import { BuildOfferAcceptedEmail } from './templates/offer-accepted.template';
import { BuildStatusChangeEmail } from './templates/status-change.template';
import { BuildReviewCreatedEmail } from './templates/review-created.template';
import { BuildVerificationApprovedEmail } from './templates/verification-approved.template';
import { BuildVerificationRejectedEmail } from './templates/verification-rejected.template';
import { BuildNewMessageEmail } from './templates/new-message.template';
import { BuildNewInquiryEmail } from './templates/new-inquiry.template';
import { BuildNewRepairRequestEmail } from './templates/new-repair-request.template';

interface EmailContent {
  to: string;
  subject: string;
  html: string;
}

function BuildContent(job: EmailJob): EmailContent {
  switch (job.kind) {
    case 'welcome':
      return { to: job.payload.to, ...BuildWelcomeEmail(job.payload) };
    case 'offer-received':
      return { to: job.payload.to, ...BuildOfferReceivedEmail(job.payload) };
    case 'offer-accepted':
      return { to: job.payload.to, ...BuildOfferAcceptedEmail(job.payload) };
    case 'status-change':
      return { to: job.payload.to, ...BuildStatusChangeEmail(job.payload) };
    case 'review-created':
      return { to: job.payload.to, ...BuildReviewCreatedEmail(job.payload) };
    case 'verification-approved':
      return {
        to: job.payload.to,
        ...BuildVerificationApprovedEmail(job.payload),
      };
    case 'verification-rejected':
      return {
        to: job.payload.to,
        ...BuildVerificationRejectedEmail(job.payload),
      };
    case 'new-message':
      return { to: job.payload.to, ...BuildNewMessageEmail(job.payload) };
    case 'new-inquiry':
      return { to: job.payload.to, ...BuildNewInquiryEmail(job.payload) };
    case 'new-repair-request':
      return {
        to: job.payload.to,
        ...BuildNewRepairRequestEmail(job.payload),
      };
  }
}

@Processor(EMAIL_QUEUE_NAME)
export class EmailProcessor extends WorkerHost {
  constructor(
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
    @InjectPinoLogger(EmailProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: Job<EmailJob>): Promise<void> {
    const content = BuildContent(job.data);

    this.logger.info(
      { jobKind: job.data.kind, to: content.to },
      'Sending email',
    );

    await this.emailService.Send(content);
  }
}
