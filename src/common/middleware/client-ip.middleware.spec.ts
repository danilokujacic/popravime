import type { Request } from 'express';
import { ResolveClientIp } from './client-ip.middleware';

function BuildRequest(
  headers: Record<string, string | string[]>,
  ip = '54.211.141.124',
): Request {
  return { headers, ip } as unknown as Request;
}

const SECRET = 'a-shared-secret-of-enough-length';

describe('ResolveClientIp', () => {
  it('uses the forwarded end-user IP when the shared secret matches', () => {
    const request = BuildRequest({
      'x-bff-secret': SECRET,
      'x-client-ip': '31.204.225.240',
    });

    expect(ResolveClientIp(request, SECRET)).toBe('31.204.225.240');
  });

  it('ignores the forwarded IP when the secret is wrong', () => {
    const request = BuildRequest({
      'x-bff-secret': 'not-the-secret',
      'x-client-ip': '6.6.6.6',
    });

    expect(ResolveClientIp(request, SECRET)).toBe('54.211.141.124');
  });

  it('ignores the forwarded IP when no secret header is sent', () => {
    const request = BuildRequest({ 'x-client-ip': '6.6.6.6' });

    expect(ResolveClientIp(request, SECRET)).toBe('54.211.141.124');
  });

  it('never trusts the header when no secret is configured', () => {
    const request = BuildRequest({
      'x-bff-secret': '',
      'x-client-ip': '6.6.6.6',
    });

    expect(ResolveClientIp(request, '')).toBe('54.211.141.124');
  });

  it('ignores a forwarded value that is not an IP address', () => {
    const request = BuildRequest({
      'x-bff-secret': SECRET,
      'x-client-ip': 'evil.example.com',
    });

    expect(ResolveClientIp(request, SECRET)).toBe('54.211.141.124');
  });
});
