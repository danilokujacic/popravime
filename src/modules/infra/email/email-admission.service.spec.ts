import type Redis from 'ioredis';
import { EmailAdmissionService } from './email-admission.service';
import { EmailConfig } from '../../../config/email.config';

function BuildConfig(overrides?: Partial<EmailConfig>): EmailConfig {
  return {
    host: 'localhost',
    port: 1025,
    secure: false,
    from: 'no-reply@popravime.me',
    enabled: true,
    dailyLimit: 250,
    dailyCriticalReserve: 25,
    ...overrides,
  };
}

function BuildService(config: EmailConfig, admitted = 1) {
  const redis = {
    eval: jest.fn().mockResolvedValue(admitted),
    quit: jest.fn().mockResolvedValue('OK'),
  } as unknown as Redis;
  const service = new EmailAdmissionService(redis, config);
  return { service, redis };
}

describe('EmailAdmissionService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('admits a non-critical email under the daily limit, counting against the limit', async () => {
    const { service, redis } = BuildService(BuildConfig());

    const result = await service.Admit('new-message');

    expect(result).toBe('admitted');
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.stringMatching(/^email:daily:\d{4}-\d{2}-\d{2}$/),
      250,
      26 * 60 * 60,
    );
  });

  it('drops a non-critical email once the daily limit is reached', async () => {
    const { service } = BuildService(BuildConfig(), 0);

    await expect(service.Admit('new-message')).resolves.toBe(
      'daily-limit-reached',
    );
  });

  it.each([
    'email-confirmation',
    'offer-accepted',
    'offer-accepted-customer',
  ] as const)('lets %s use the reserve above the daily limit', async (kind) => {
    const { service, redis } = BuildService(BuildConfig());

    const result = await service.Admit(kind);

    expect(result).toBe('admitted');
    expect(redis.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      expect.any(String),
      275,
      expect.any(Number),
    );
  });

  it('drops even a critical email once the reserve is exhausted', async () => {
    const { service } = BuildService(BuildConfig(), 0);

    await expect(service.Admit('email-confirmation')).resolves.toBe(
      'daily-limit-reached',
    );
  });

  it('drops everything without touching Redis when sending is disabled', async () => {
    const { service, redis } = BuildService(BuildConfig({ enabled: false }));

    await expect(service.Admit('email-confirmation')).resolves.toBe('disabled');
    await expect(service.Admit('new-message')).resolves.toBe('disabled');
    expect(redis.eval).not.toHaveBeenCalled();
  });

  it('counts against a fresh key on a new UTC day', async () => {
    jest.useFakeTimers();
    const { service, redis } = BuildService(BuildConfig());

    jest.setSystemTime(new Date('2026-09-19T23:59:59Z'));
    await service.Admit('new-message');
    jest.setSystemTime(new Date('2026-09-20T00:00:01Z'));
    await service.Admit('new-message');

    const keys = (redis.eval as jest.Mock).mock.calls.map(
      (call: unknown[]) => call[2],
    );
    expect(keys).toEqual(['email:daily:2026-09-19', 'email:daily:2026-09-20']);
  });

  it('closes its Redis connection on shutdown', async () => {
    const { service, redis } = BuildService(BuildConfig());

    await service.onModuleDestroy();

    expect(redis.quit).toHaveBeenCalledTimes(1);
  });
});
