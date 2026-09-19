import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ITurnstileService } from './turnstile.service.interface';
import {
  ExtractErrorCodes,
  IsSiteverifyResponse,
  MAX_TURNSTILE_TOKEN_LENGTH,
} from './turnstile.types';
import { turnstileConfig } from '../../../config/turnstile.config';

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 3000;

@Injectable()
export class TurnstileService implements ITurnstileService {
  constructor(
    private readonly httpService: HttpService,
    @Inject(turnstileConfig.KEY)
    private readonly config: ConfigType<typeof turnstileConfig>,
    @InjectPinoLogger(TurnstileService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Verify(token: string | null, remoteIp: string): Promise<boolean> {
    if (this.config.secretKey === '') {
      this.logger.warn(
        'Turnstile verification skipped: TURNSTILE_SECRET_KEY is not set',
      );
      return true;
    }
    if (!token || token.length > MAX_TURNSTILE_TOKEN_LENGTH) {
      this.logger.warn(
        { tokenPresent: Boolean(token) },
        'Turnstile verification failed: token missing or too long',
      );
      return false;
    }
    return this.Siteverify(token, remoteIp);
  }

  private async Siteverify(token: string, remoteIp: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<unknown>(
          SITEVERIFY_URL,
          {
            secret: this.config.secretKey,
            response: token,
            remoteip: remoteIp === '' ? undefined : remoteIp,
          },
          { timeout: SITEVERIFY_TIMEOUT_MS },
        ),
      );
      return this.EvaluateResponse(response.data);
    } catch (error) {
      this.logger.error(
        { message: error instanceof Error ? error.message : 'unknown error' },
        'Turnstile siteverify request failed, failing closed',
      );
      return false;
    }
  }

  private EvaluateResponse(data: unknown): boolean {
    const success = IsSiteverifyResponse(data) && data.success;
    if (!success) {
      this.logger.warn(
        { errorCodes: ExtractErrorCodes(data) },
        'Turnstile verification rejected by Cloudflare',
      );
    }
    return success;
  }
}
