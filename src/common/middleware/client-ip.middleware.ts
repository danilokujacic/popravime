import { createHash, timingSafeEqual } from 'crypto';
import { isIP } from 'net';
import type { NextFunction, Request, Response } from 'express';

const SECRET_HEADER = 'x-bff-secret';
const CLIENT_IP_HEADER = 'x-client-ip';

function HeaderValue(request: Request, name: string): string | undefined {
  const value = request.headers[name];
  return typeof value === 'string' ? value : undefined;
}

function SecretsMatch(provided: string, expected: string): boolean {
  const providedHash = createHash('sha256').update(provided).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export function ResolveClientIp(
  request: Request,
  sharedSecret: string,
): string {
  const providedSecret = HeaderValue(request, SECRET_HEADER);
  const forwardedIp = HeaderValue(request, CLIENT_IP_HEADER);

  const isTrustedForward =
    sharedSecret !== '' &&
    providedSecret !== undefined &&
    forwardedIp !== undefined &&
    isIP(forwardedIp) !== 0 &&
    SecretsMatch(providedSecret, sharedSecret);

  return isTrustedForward ? forwardedIp : (request.ip ?? '');
}

export function BuildClientIpMiddleware(sharedSecret: string) {
  return (request: Request, _response: Response, next: NextFunction): void => {
    request.clientIp = ResolveClientIp(request, sharedSecret);
    next();
  };
}
