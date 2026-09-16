import { ThrottlerStorage } from '@nestjs/throttler';
import { EmailCooldownService } from './email-cooldown.service';

function BuildService(totalHits: number) {
  const storage = {
    increment: jest.fn().mockResolvedValue({
      totalHits,
      timeToExpire: 60,
      isBlocked: false,
      timeToBlockExpire: 0,
    }),
  } as unknown as ThrottlerStorage;

  const logger = {
    warn: jest.fn(),
  } as unknown as ConstructorParameters<typeof EmailCooldownService>[1];

  const service = new EmailCooldownService(storage, logger);

  return { service, storage, logger };
}

describe('EmailCooldownService.ShouldSend', () => {
  afterEach(() => {
    delete process.env.THROTTLE_EMAIL_RECIPIENT_LIMIT;
    delete process.env.THROTTLE_EMAIL_RECIPIENT_TTL_MS;
  });

  it('allows sending while under the cap', async () => {
    process.env.THROTTLE_EMAIL_RECIPIENT_LIMIT = '20';
    const { service } = BuildService(5);

    await expect(service.ShouldSend('user-1')).resolves.toBe(true);
  });

  it('blocks sending once the cap is exceeded and logs it', async () => {
    process.env.THROTTLE_EMAIL_RECIPIENT_LIMIT = '20';
    const { service, logger } = BuildService(21);

    await expect(service.ShouldSend('user-1')).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'user-1', totalHits: 21 }),
      expect.any(String),
    );
  });
});
