import type { Queue } from 'bullmq';
import type { PinoLogger } from 'nestjs-pino';
import { EmailQueueService } from './email-queue.service';
import { EmailJob } from './email.types';
import { Locale } from '../../users/users.types';

describe('EmailQueueService', () => {
  it('adds the job to the queue and logs the enqueue with its correlation id', async () => {
    const queue = { add: jest.fn().mockResolvedValue(undefined) } as unknown as Queue<EmailJob>;
    const logger = { info: jest.fn() } as unknown as PinoLogger;
    const service = new EmailQueueService(queue, logger);
    const job: EmailJob = {
      kind: 'welcome',
      payload: {
        to: 'user@popravime.me',
        locale: Locale.En,
        fullName: 'Test User',
      },
      correlationId: 'correlation-1',
    };

    await service.Enqueue(job);

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
});
