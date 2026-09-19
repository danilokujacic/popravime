import type { Queue } from 'bullmq';
import type { PinoLogger } from 'nestjs-pino';
import { EmailQueueService } from './email-queue.service';
import { EmailAdmissionService } from './email-admission.service';
import { EmailAdmission, EmailJob } from './email.types';
import { Locale } from '../../users/users.types';

function BuildJob(
  kind: 'welcome' | 'email-confirmation' = 'welcome',
): EmailJob {
  if (kind === 'email-confirmation') {
    return {
      kind,
      payload: {
        to: 'user@popravime.me',
        locale: Locale.En,
        fullName: 'Test User',
        confirmUrl: 'https://popravime.me/confirm-email/slug',
      },
      correlationId: 'correlation-1',
    };
  }
  return {
    kind,
    payload: {
      to: 'user@popravime.me',
      locale: Locale.En,
      fullName: 'Test User',
    },
    correlationId: 'correlation-1',
  };
}

function BuildService(admission: EmailAdmission) {
  const queue = {
    add: jest.fn().mockResolvedValue(undefined),
  } as unknown as Queue<EmailJob>;
  const admissionService = {
    Admit: jest.fn().mockResolvedValue(admission),
  } as unknown as EmailAdmissionService;
  const logger = { info: jest.fn(), warn: jest.fn() } as unknown as PinoLogger;
  const service = new EmailQueueService(queue, admissionService, logger);
  return { service, queue, admissionService, logger };
}

describe('EmailQueueService', () => {
  it('adds an admitted job to the queue and logs the enqueue with its correlation id', async () => {
    const { service, queue, admissionService, logger } =
      BuildService('admitted');
    const job = BuildJob();

    await service.Enqueue(job);

    expect(admissionService.Admit).toHaveBeenCalledWith('welcome');
    expect(queue.add).toHaveBeenCalledWith(
      'welcome',
      job,
      expect.objectContaining({ attempts: 3 }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      {
        emailKind: 'welcome',
        correlationId: 'correlation-1',
      },
      'Email queued',
    );
  });

  it('drops the job and logs "Email daily limit reached" when the daily limit is hit', async () => {
    const { service, queue, logger } = BuildService('daily-limit-reached');

    await service.Enqueue(BuildJob());

    expect(queue.add).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      {
        emailKind: 'welcome',
        correlationId: 'correlation-1',
        critical: false,
      },
      'Email daily limit reached, dropping email',
    );
  });

  it('flags a dropped critical kind in the daily-limit log', async () => {
    const { service, queue, logger } = BuildService('daily-limit-reached');

    await service.Enqueue(BuildJob('email-confirmation'));

    expect(queue.add).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        emailKind: 'email-confirmation',
        critical: true,
      }),
      'Email daily limit reached, dropping email',
    );
  });

  it('drops the job with a distinct log line when sending is disabled', async () => {
    const { service, queue, logger } = BuildService('disabled');

    await service.Enqueue(BuildJob());

    expect(queue.add).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      { emailKind: 'welcome', correlationId: 'correlation-1' },
      'Email sending disabled, dropping email',
    );
  });
});
