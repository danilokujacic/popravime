import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DirectInquiriesController } from './direct-inquiries.controller';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { TurnstileGuard } from '../infra/turnstile/turnstile.guard';

describe('DirectInquiriesController.Create', () => {
  it('resolves the caller before the captcha check so signed-in users skip it', () => {
    const guards: unknown[] = Reflect.getMetadata(
      GUARDS_METADATA,
      DirectInquiriesController.prototype.Create,
    );

    expect(guards).toEqual([OptionalAuthGuard, TurnstileGuard]);
  });
});
