import type { Job } from 'bullmq';
import type { PinoLogger } from 'nestjs-pino';
import { EmailProcessor } from './email.processor';
import type { EmailService } from './email.service.interface';
import { EmailJob } from './email.types';
import { Locale } from '../../users/users.types';

function BuildJob(
  overrides?: Partial<EmailJob>,
  jobOverrides?: { attemptsMade?: number; opts?: { attempts?: number } },
): Job<EmailJob> {
  return {
    data: {
      kind: 'welcome',
      payload: {
        to: 'user@popravime.me',
        locale: Locale.En,
        fullName: 'Test User',
      },
      correlationId: 'correlation-1',
      ...overrides,
    },
    attemptsMade: 0,
    opts: {},
    ...jobOverrides,
  } as unknown as Job<EmailJob>;
}

describe('EmailProcessor', () => {
  function BuildProcessor(emailService: Partial<EmailService>) {
    const logger = {
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as PinoLogger;
    const processor = new EmailProcessor(
      emailService as EmailService,
      logger,
    );
    return { processor, logger };
  }

  it('logs the accepted recipients and message id on success', async () => {
    const emailService: Partial<EmailService> = {
      Send: jest.fn().mockResolvedValue({
        accepted: ['user@popravime.me'],
        rejected: [],
        messageId: '<message-1@smtp>',
      }),
    };
    const { processor, logger } = BuildProcessor(emailService);

    await processor.process(BuildJob());

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        emailKind: 'welcome',
        accepted: ['user@popravime.me'],
        messageId: '<message-1@smtp>',
        correlationId: 'correlation-1',
      }),
      'Email sent',
    );
  });

  it('logs the provider error and rethrows so BullMQ retries the job', async () => {
    const smtpError = Object.assign(new Error('535 authentication failed'), {
      code: 'EAUTH',
      responseCode: 535,
    });
    const emailService: Partial<EmailService> = {
      Send: jest.fn().mockRejectedValue(smtpError),
    };
    const { processor, logger } = BuildProcessor(emailService);

    await expect(processor.process(BuildJob())).rejects.toThrow(smtpError);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        emailKind: 'welcome',
        correlationId: 'correlation-1',
        message: '535 authentication failed',
        code: 'EAUTH',
        responseCode: 535,
      }),
      'Email send failed',
    );
  });

  describe('OnFailed', () => {
    it('logs exhaustion once the final attempt has failed', () => {
      const { processor, logger } = BuildProcessor({});
      const job = BuildJob(
        {},
        { attemptsMade: 3, opts: { attempts: 3 } },
      );

      processor.OnFailed(job, new Error('535 authentication failed'));

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          emailKind: 'welcome',
          correlationId: 'correlation-1',
          attemptsMade: 3,
          message: '535 authentication failed',
        }),
        'Email job exhausted all retry attempts',
      );
    });

    it('does not log exhaustion while retries remain', () => {
      const { processor, logger } = BuildProcessor({});
      const job = BuildJob({}, { attemptsMade: 1, opts: { attempts: 3 } });

      processor.OnFailed(job, new Error('temporary failure'));

      expect(logger.error).not.toHaveBeenCalled();
    });

    it('ignores a missing job reference', () => {
      const { processor, logger } = BuildProcessor({});

      processor.OnFailed(undefined, new Error('temporary failure'));

      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
