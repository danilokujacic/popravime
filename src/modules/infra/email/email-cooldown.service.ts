import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const RECIPIENT_THROTTLER_NAME = 'email-recipient-cooldown';
const CONFIRMATION_THROTTLER_NAME = 'confirmation-email-cooldown';

@Injectable()
export class EmailCooldownService {
  constructor(
    @Inject(ThrottlerStorage) private readonly storage: ThrottlerStorage,
    @InjectPinoLogger(EmailCooldownService.name)
    private readonly logger: PinoLogger,
  ) {}

  async ShouldSend(recipientUserId: string): Promise<boolean> {
    const limit = Number(process.env.THROTTLE_EMAIL_RECIPIENT_LIMIT ?? 20);
    const ttl = Number(process.env.THROTTLE_EMAIL_RECIPIENT_TTL_MS ?? 3600000);

    const totalHits = await this.Consume(
      RECIPIENT_THROTTLER_NAME,
      recipientUserId,
      limit,
      ttl,
    );
    const allowed = totalHits <= limit;
    if (!allowed) {
      this.logger.warn(
        { recipientUserId, totalHits, limit },
        'Email cooldown exceeded, dropping email send',
      );
    }
    return allowed;
  }

  async ShouldSendConfirmation(email: string): Promise<boolean> {
    const limit = Number(process.env.THROTTLE_CONFIRMATION_EMAIL_LIMIT ?? 3);
    const ttl = Number(
      process.env.THROTTLE_CONFIRMATION_EMAIL_TTL_MS ?? 3600000,
    );

    const totalHits = await this.Consume(
      CONFIRMATION_THROTTLER_NAME,
      email.trim().toLowerCase(),
      limit,
      ttl,
    );
    return totalHits <= limit;
  }

  private async Consume(
    throttlerName: string,
    key: string,
    limit: number,
    ttl: number,
  ): Promise<number> {
    const record = await this.storage.increment(
      key,
      ttl,
      limit,
      ttl,
      throttlerName,
    );
    return record.totalHits;
  }
}
