import { Inject } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { EmailService } from './email.service.interface';
import { EmailJob } from './email.types';
import {
  EMAIL_QUEUE_NAME,
  EMAIL_SERVICE,
} from '../../../common/constants/di-tokens';
import { BuildWelcomeEmail } from './templates/welcome.template';
import { BuildEmailConfirmationEmail } from './templates/email-confirmation.template';
import { BuildOfferReceivedEmail } from './templates/offer-received.template';
import { BuildOfferAcceptedEmail } from './templates/offer-accepted.template';
import { BuildOfferAcceptedCustomerEmail } from './templates/offer-accepted-customer.template';
import { BuildStatusChangeEmail } from './templates/status-change.template';
import { BuildReviewCreatedEmail } from './templates/review-created.template';
import { BuildVerificationApprovedEmail } from './templates/verification-approved.template';
import { BuildVerificationRejectedEmail } from './templates/verification-rejected.template';
import { BuildNewMessageEmail } from './templates/new-message.template';
import { BuildNewInquiryEmail } from './templates/new-inquiry.template';
import { BuildNewRepairRequestEmail } from './templates/new-repair-request.template';
import { BuildOfferCancelledEmail } from './templates/offer-cancelled.template';

interface EmailContent {
  to: string;
  subject: string;
  html: string;
}

function BuildContent(job: EmailJob): EmailContent {
  switch (job.kind) {
    case 'welcome':
      return { to: job.payload.to, ...BuildWelcomeEmail(job.payload) };
    case 'email-confirmation':
      return {
        to: job.payload.to,
        ...BuildEmailConfirmationEmail(job.payload),
      };
    case 'offer-received':
      return { to: job.payload.to, ...BuildOfferReceivedEmail(job.payload) };
    case 'offer-accepted':
      return { to: job.payload.to, ...BuildOfferAcceptedEmail(job.payload) };
    case 'offer-accepted-customer':
      return {
        to: job.payload.to,
        ...BuildOfferAcceptedCustomerEmail(job.payload),
      };
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
    case 'offer-cancelled':
      return { to: job.payload.to, ...BuildOfferCancelledEmail(job.payload) };
  }
}

interface SmtpErrorDetails {
  message: string;
  code?: string;
  responseCode?: number;
}

function ExtractSmtpErrorDetails(error: unknown): SmtpErrorDetails {
  if (!(error instanceof Error)) {
    return { message: 'unknown error' };
  }

  const code =
    'code' in error && typeof error.code === 'string' ? error.code : undefined;
  const responseCode =
    'responseCode' in error && typeof error.responseCode === 'number'
      ? error.responseCode
      : undefined;

  return { message: error.message, code, responseCode };
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
    const { kind: emailKind, correlationId } = job.data;
    const attempt = job.attemptsMade + 1;

    this.logger.info(
      { emailKind, to: content.to, attempt, correlationId },
      'Processing queued email',
    );

    try {
      const result = await this.emailService.Send(content);
      this.logger.info(
        {
          emailKind,
          to: content.to,
          accepted: result.accepted,
          rejected: result.rejected,
          messageId: result.messageId,
          correlationId,
        },
        'Email sent',
      );
    } catch (error) {
      this.logger.error(
        {
          emailKind,
          to: content.to,
          attempt,
          correlationId,
          ...ExtractSmtpErrorDetails(error),
        },
        'Email send failed',
      );
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  OnFailed(job: Job<EmailJob> | undefined, error: Error): void {
    if (!job) {
      return;
    }

    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) {
      return;
    }

    this.logger.error(
      {
        emailKind: job.data.kind,
        to: job.data.payload.to,
        correlationId: job.data.correlationId,
        attemptsMade: job.attemptsMade,
        ...ExtractSmtpErrorDetails(error),
      },
      'Email job exhausted all retry attempts',
    );
  }
}
