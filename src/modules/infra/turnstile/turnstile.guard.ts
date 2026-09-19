import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Request } from 'express';
import type { ITurnstileService } from './turnstile.service.interface';
import { TURNSTILE_SERVICE } from '../../../common/constants/di-tokens';
import { DomainForbiddenException } from '../../../common/exceptions/forbidden.exception';
import type { AuthenticatedUser } from '../../../common/interfaces/authenticated-request.interface';

const TOKEN_FIELD = 'turnstile_token';

function ExtractToken(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || !(TOKEN_FIELD in body)) {
    return null;
  }
  const token = body[TOKEN_FIELD];
  return typeof token === 'string' ? token : null;
}

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(
    @Inject(TURNSTILE_SERVICE)
    private readonly turnstileService: ITurnstileService,
    @InjectPinoLogger(TurnstileGuard.name)
    private readonly logger: PinoLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    if (request.user) {
      return true;
    }

    const body: unknown = request.body;
    const verified = await this.turnstileService.Verify(
      ExtractToken(body),
      request.clientIp ?? request.ip ?? '',
    );
    if (!verified) {
      this.logger.warn(
        { path: request.path },
        'Request rejected: captcha verification failed',
      );
      throw new DomainForbiddenException(
        'CAPTCHA_FAILED',
        'Captcha verification failed',
      );
    }
    return true;
  }
}
