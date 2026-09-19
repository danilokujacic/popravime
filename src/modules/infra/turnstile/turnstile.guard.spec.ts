import type { ExecutionContext } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { TurnstileGuard } from './turnstile.guard';
import type { ITurnstileService } from './turnstile.service.interface';
import { DomainForbiddenException } from '../../../common/exceptions/forbidden.exception';
import { UserRole } from '../../users/users.types';

interface FakeRequest {
  body: unknown;
  clientIp?: string;
  ip?: string;
  path: string;
  user?: { id: string; email: string; role: UserRole };
}

function BuildGuard(verified: boolean) {
  const turnstileService = {
    Verify: jest.fn().mockResolvedValue(verified),
  } as unknown as ITurnstileService;
  const logger = { warn: jest.fn() } as unknown as PinoLogger;
  const guard = new TurnstileGuard(turnstileService, logger);
  return { guard, turnstileService, logger };
}

function BuildContext(request: FakeRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('TurnstileGuard', () => {
  it('lets the request through when the token verifies, passing the real client ip', async () => {
    const { guard, turnstileService } = BuildGuard(true);
    const request: FakeRequest = {
      body: { turnstile_token: 'token-1', email: 'a@example.com' },
      clientIp: '203.0.113.7',
      ip: '10.0.0.1',
      path: '/auth/register',
    };

    await expect(guard.canActivate(BuildContext(request))).resolves.toBe(true);
    expect(turnstileService.Verify).toHaveBeenCalledWith(
      'token-1',
      '203.0.113.7',
    );
  });

  it('falls back to the socket ip when no client ip was resolved', async () => {
    const { guard, turnstileService } = BuildGuard(true);
    const request: FakeRequest = {
      body: { turnstile_token: 'token-1' },
      ip: '10.0.0.1',
      path: '/auth/register',
    };

    await guard.canActivate(BuildContext(request));

    expect(turnstileService.Verify).toHaveBeenCalledWith('token-1', '10.0.0.1');
  });

  it('rejects with CAPTCHA_FAILED when verification fails', async () => {
    const { guard, logger } = BuildGuard(false);
    const request: FakeRequest = {
      body: { turnstile_token: 'bad-token' },
      clientIp: '203.0.113.7',
      path: '/auth/register',
    };

    const attempt = guard.canActivate(BuildContext(request));

    await expect(attempt).rejects.toBeInstanceOf(DomainForbiddenException);
    await expect(attempt).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
    expect(logger.warn).toHaveBeenCalledWith(
      { path: '/auth/register' },
      'Request rejected: captcha verification failed',
    );
  });

  it.each([
    ['no body', undefined],
    ['an empty body', {}],
    ['a non-string token', { turnstile_token: 42 }],
  ])('hands a null token to the service for %s', async (_label, body) => {
    const { guard, turnstileService } = BuildGuard(false);
    const request: FakeRequest = { body, clientIp: '203.0.113.7', path: '/x' };

    await expect(
      guard.canActivate(BuildContext(request)),
    ).rejects.toMatchObject({ code: 'CAPTCHA_FAILED' });
    expect(turnstileService.Verify).toHaveBeenCalledWith(null, '203.0.113.7');
  });

  it('skips verification for an authenticated caller', async () => {
    const { guard, turnstileService } = BuildGuard(false);
    const request: FakeRequest = {
      body: {},
      path: '/direct-inquiries',
      user: { id: 'user-1', email: 'u@example.com', role: UserRole.Customer },
    };

    await expect(guard.canActivate(BuildContext(request))).resolves.toBe(true);
    expect(turnstileService.Verify).not.toHaveBeenCalled();
  });
});
