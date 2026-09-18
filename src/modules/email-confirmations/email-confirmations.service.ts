import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EmailConfirmationsRepository } from './email-confirmations.repository';
import { emailConfirmationConfig } from '../../config/email-confirmation.config';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';

@Injectable()
export class EmailConfirmationsService {
  constructor(
    private readonly repository: EmailConfirmationsRepository,
    @Inject(emailConfirmationConfig.KEY)
    private readonly config: ConfigType<typeof emailConfirmationConfig>,
    @InjectPinoLogger(EmailConfirmationsService.name)
    private readonly logger: PinoLogger,
  ) {}

  // Any earlier outstanding link for this email is invalidated first — a fresh Create (register
  // resending, or an explicit resend request) should leave exactly one valid link, not several.
  async Create(email: string): Promise<{ slug: string; expiresAt: Date }> {
    await this.repository.DeleteAllForEmail(email);

    const slug = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.ttlSeconds * 1000);
    await this.repository.Create({ slug, email, expiresAt });

    return { slug, expiresAt };
  }

  // Single-use: the row is gone whether this call succeeds or the link had already expired, so a
  // stale tab retrying the same slug always gets a clean, consistent error rather than
  // succeeding twice or hanging around forever.
  async Confirm(slug: string): Promise<string> {
    const record = await this.repository.FindBySlug(slug);
    if (!record) {
      this.logger.warn(
        {},
        'Email confirmation attempted with an invalid or already-used link',
      );
      throw new DomainNotFoundException(
        'EMAIL_CONFIRMATION_NOT_FOUND',
        'This confirmation link is invalid or has already been used',
      );
    }

    await this.repository.DeleteById(record.id);

    if (record.expiresAt.getTime() < Date.now()) {
      this.logger.warn(
        { confirmationId: record.id },
        'Email confirmation attempted with an expired link',
      );
      throw new DomainConflictException(
        'EMAIL_CONFIRMATION_EXPIRED',
        'This confirmation link has expired',
      );
    }

    return record.email;
  }
}
