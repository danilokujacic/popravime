import { HttpService } from '@nestjs/axios';
import type { PinoLogger } from 'nestjs-pino';
import { of, throwError } from 'rxjs';
import { TurnstileService } from './turnstile.service';
import { TurnstileConfig } from '../../../config/turnstile.config';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

function BuildService(
  secretKey: string,
  post: jest.Mock = jest.fn().mockReturnValue(of({ data: { success: true } })),
) {
  const httpService = { post } as unknown as HttpService;
  const config: TurnstileConfig = { secretKey };
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;
  const service = new TurnstileService(httpService, config, logger);
  return { service, post, logger };
}

describe('TurnstileService.Verify', () => {
  it('accepts a token Cloudflare reports as successful, sending the secret, token and client ip', async () => {
    const { service, post } = BuildService('secret');

    const result = await service.Verify('token-1', '203.0.113.7');

    expect(result).toBe(true);
    expect(post).toHaveBeenCalledWith(
      SITEVERIFY_URL,
      { secret: 'secret', response: 'token-1', remoteip: '203.0.113.7' },
      { timeout: 3000 },
    );
  });

  it('omits remoteip when the client ip is unknown', async () => {
    const { service, post } = BuildService('secret');

    await service.Verify('token-1', '');

    expect(post).toHaveBeenCalledWith(
      SITEVERIFY_URL,
      expect.objectContaining({ remoteip: undefined }),
      expect.anything(),
    );
  });

  it('rejects when Cloudflare answers success:false, logging the error codes but not the token', async () => {
    const post = jest.fn().mockReturnValue(
      of({
        data: { success: false, 'error-codes': ['invalid-input-response'] },
      }),
    );
    const { service, logger } = BuildService('secret', post);

    const result = await service.Verify('token-1', '203.0.113.7');

    expect(result).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      { errorCodes: ['invalid-input-response'] },
      'Turnstile verification rejected by Cloudflare',
    );
  });

  it('rejects a malformed Cloudflare response', async () => {
    const post = jest.fn().mockReturnValue(of({ data: 'gateway timeout' }));
    const { service } = BuildService('secret', post);

    await expect(service.Verify('token-1', '203.0.113.7')).resolves.toBe(false);
  });

  it('fails closed and logs when Cloudflare is unreachable', async () => {
    const post = jest
      .fn()
      .mockReturnValue(throwError(() => new Error('connect ETIMEDOUT')));
    const { service, logger } = BuildService('secret', post);

    const result = await service.Verify('token-1', '203.0.113.7');

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      { message: 'connect ETIMEDOUT' },
      'Turnstile siteverify request failed, failing closed',
    );
  });

  it.each([null, ''])(
    'rejects a missing token (%p) without calling Cloudflare',
    async (token) => {
      const { service, post } = BuildService('secret');

      await expect(service.Verify(token, '203.0.113.7')).resolves.toBe(false);
      expect(post).not.toHaveBeenCalled();
    },
  );

  it('rejects an oversized token without calling Cloudflare', async () => {
    const { service, post } = BuildService('secret');

    await expect(service.Verify('x'.repeat(2049), '203.0.113.7')).resolves.toBe(
      false,
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('skips verification entirely when no secret key is configured', async () => {
    const { service, post, logger } = BuildService('');

    await expect(service.Verify(null, '203.0.113.7')).resolves.toBe(true);
    expect(post).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalled();
  });
});
