import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, unknown>): Promise<string> {
    const clientIp = request.clientIp;
    const ip = request.ip;
    if (typeof clientIp === 'string' && clientIp !== '') {
      return Promise.resolve(clientIp);
    }
    return Promise.resolve(typeof ip === 'string' ? ip : '');
  }
}
