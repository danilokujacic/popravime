import { OAuthExchangeService } from './oauth-exchange.service';
import { CacheService } from '../infra/cache/cache.service';
import { OAuthProvider } from '../users/users.types';
import { DomainUnauthorizedException } from '../../common/exceptions/unauthorized.exception';

function BuildService(overrides?: {
  cacheService?: Partial<Record<keyof CacheService, jest.Mock>>;
}) {
  const store = new Map<string, unknown>();

  const cacheService = {
    Set: jest.fn((key: string, value: unknown) => {
      store.set(key, value);
    }),
    Get: jest.fn((key: string) => store.get(key)),
    Delete: jest.fn((key: string) => store.delete(key)),
    ...overrides?.cacheService,
  } as unknown as CacheService;

  const config = {
    frontendRedirectUrl: 'http://localhost:3000/auth/callback',
    exchangeCodeTtlSeconds: 60,
  } as ConstructorParameters<typeof OAuthExchangeService>[1];

  const service = new OAuthExchangeService(cacheService, config);

  return { service, cacheService, store };
}

describe('OAuthExchangeService token codes', () => {
  it('returns the token pair once for a valid code, then invalidates it', async () => {
    const { service } = BuildService();
    const tokens = { accessToken: 'a', refreshToken: 'r' };

    const code = await service.CreateTokenCode(tokens);
    const result = await service.ConsumeTokenCode(code);

    expect(result).toEqual(tokens);
    await expect(service.ConsumeTokenCode(code)).rejects.toBeInstanceOf(
      DomainUnauthorizedException,
    );
  });

  it('rejects an unknown code', async () => {
    const { service } = BuildService();

    await expect(
      service.ConsumeTokenCode('never-issued'),
    ).rejects.toBeInstanceOf(DomainUnauthorizedException);
  });

  it('builds a redirect url carrying the code', () => {
    const { service } = BuildService();

    const url = service.BuildTokenRedirectUrl('abc-123');

    expect(url).toBe('http://localhost:3000/auth/callback?code=abc-123');
  });
});

describe('OAuthExchangeService profile codes', () => {
  const profile = {
    provider: OAuthProvider.Google,
    providerId: 'google-123',
    email: 'ana@popravime.me',
    fullName: 'Ana Petrović',
  };

  it('returns the profile once for a valid code, then invalidates it', async () => {
    const { service } = BuildService();

    const code = await service.CreateProfileCode(profile);
    const result = await service.ConsumeProfileCode(code);

    expect(result).toEqual(profile);
    await expect(service.ConsumeProfileCode(code)).rejects.toBeInstanceOf(
      DomainUnauthorizedException,
    );
  });

  it('rejects an unknown code', async () => {
    const { service } = BuildService();

    await expect(
      service.ConsumeProfileCode('never-issued'),
    ).rejects.toBeInstanceOf(DomainUnauthorizedException);
  });

  it('builds a redirect url carrying the code and a needs_role flag', () => {
    const { service } = BuildService();

    const url = service.BuildRoleSelectionRedirectUrl('abc-123');

    expect(url).toBe(
      'http://localhost:3000/auth/callback?code=abc-123&needs_role=1',
    );
  });

  it('keeps token codes and profile codes in separate namespaces', async () => {
    const { service } = BuildService();
    const tokens = { accessToken: 'a', refreshToken: 'r' };

    const tokenCode = await service.CreateTokenCode(tokens);

    await expect(service.ConsumeProfileCode(tokenCode)).rejects.toBeInstanceOf(
      DomainUnauthorizedException,
    );
  });
});
