import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

const THROTTLER_NAME = 'email-recipient-cooldown';

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

    const record = await this.storage.increment(
      recipientUserId,
      ttl,
      limit,
      ttl,
      THROTTLER_NAME,
    );

    const allowed = record.totalHits <= limit;
    if (!allowed) {
      this.logger.warn(
        { recipientUserId, totalHits: record.totalHits, limit },
        'Email cooldown exceeded, dropping email send',
      );
    }
    return allowed;
  }
}
