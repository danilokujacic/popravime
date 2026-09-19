import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { emailConfig } from '../../../config/email.config';
import { EMAIL_LIMIT_REDIS } from '../../../common/constants/di-tokens';
import { CRITICAL_EMAIL_KINDS } from './critical-email-kinds';
import { IEmailAdmissionService } from './email-admission.service.interface';
import { EmailAdmission, EmailJob } from './email.types';

const DAILY_COUNTER_TTL_SECONDS = 26 * 60 * 60;

const CONSUME_UNDER_CEILING = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
if count >= tonumber(ARGV[1]) then
  return 0
end
if redis.call('INCR', KEYS[1]) == 1 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return 1
`;

@Injectable()
export class EmailAdmissionService
  implements IEmailAdmissionService, OnModuleDestroy
{
  constructor(
    @Inject(EMAIL_LIMIT_REDIS) private readonly redis: Redis,
    @Inject(emailConfig.KEY)
    private readonly config: ConfigType<typeof emailConfig>,
  ) {}

  async Admit(kind: EmailJob['kind']): Promise<EmailAdmission> {
    if (!this.config.enabled) {
      return 'disabled';
    }
    const admitted = await this.Consume(this.CeilingFor(kind));
    return admitted ? 'admitted' : 'daily-limit-reached';
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private CeilingFor(kind: EmailJob['kind']): number {
    return CRITICAL_EMAIL_KINDS.has(kind)
      ? this.config.dailyLimit + this.config.dailyCriticalReserve
      : this.config.dailyLimit;
  }

  private async Consume(ceiling: number): Promise<boolean> {
    const result = await this.redis.eval(
      CONSUME_UNDER_CEILING,
      1,
      this.CounterKey(),
      ceiling,
      DAILY_COUNTER_TTL_SECONDS,
    );
    return result === 1;
  }

  private CounterKey(): string {
    return `email:daily:${new Date().toISOString().slice(0, 10)}`;
  }
}
