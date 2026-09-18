import { TermsAcceptanceService } from './terms-acceptance.service';
import { UsersRepository } from './users.repository';
import { CacheService } from '../infra/cache/cache.service';
import { User } from './entities/user.entity';

function BuildService(options?: {
  cached?: string;
  termsVersion?: string | null;
  userMissing?: boolean;
}) {
  const usersRepository = {
    FindById: jest
      .fn()
      .mockResolvedValue(
        options?.userMissing
          ? null
          : ({
              id: 'user-1',
              termsVersion: options?.termsVersion ?? null,
            } as User),
      ),
  } as unknown as UsersRepository;
  const cacheService = {
    Get: jest.fn().mockResolvedValue(options?.cached),
    Set: jest.fn().mockResolvedValue(undefined),
    Delete: jest.fn().mockResolvedValue(true),
  } as unknown as CacheService;

  const service = new TermsAcceptanceService(usersRepository, cacheService, {
    termsVersion: '2026-09-18',
    termsCacheTtlSeconds: 300,
  });

  return { service, usersRepository, cacheService };
}

describe('TermsAcceptanceService', () => {
  it('accepts a user whose stored version matches the current one, and caches it', async () => {
    const { service, cacheService } = BuildService({
      termsVersion: '2026-09-18',
    });

    await expect(service.HasAccepted('user-1')).resolves.toBe(true);
    expect(cacheService.Set).toHaveBeenCalledWith(
      'terms-version:user-1',
      '2026-09-18',
      300,
    );
  });

  it('rejects a user with no accepted version', async () => {
    const { service } = BuildService({ termsVersion: null });

    await expect(service.HasAccepted('user-1')).resolves.toBe(false);
  });

  it('rejects a user who accepted an older version', async () => {
    const { service } = BuildService({ termsVersion: '2026-01-01' });

    await expect(service.HasAccepted('user-1')).resolves.toBe(false);
  });

  it('uses the cache without touching the database', async () => {
    const { service, usersRepository } = BuildService({
      cached: '2026-09-18',
    });

    await expect(service.HasAccepted('user-1')).resolves.toBe(true);
    expect(usersRepository.FindById).not.toHaveBeenCalled();
  });

  it('compares a cached old version against the current one, so a version bump takes effect', async () => {
    const { service } = BuildService({ cached: '2026-01-01' });

    await expect(service.HasAccepted('user-1')).resolves.toBe(false);
  });

  it('treats a missing user as not accepted', async () => {
    const { service } = BuildService({ userMissing: true });

    await expect(service.HasAccepted('user-1')).resolves.toBe(false);
  });

  it('clears the cached version on invalidate', async () => {
    const { service, cacheService } = BuildService();

    await service.Invalidate('user-1');

    expect(cacheService.Delete).toHaveBeenCalledWith('terms-version:user-1');
  });
});
