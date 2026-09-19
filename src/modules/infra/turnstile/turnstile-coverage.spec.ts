import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthController } from '../../auth/auth.controller';
import { ContactMessagesController } from '../../contact-messages/contact-messages.controller';
import { DirectInquiriesController } from '../../direct-inquiries/direct-inquiries.controller';
import { TurnstileGuard } from './turnstile.guard';

function GuardsOf(handler: object): unknown[] {
  const guards: unknown[] | undefined = Reflect.getMetadata(
    GUARDS_METADATA,
    handler,
  );
  return guards ?? [];
}

describe('Turnstile coverage', () => {
  it.each([
    ['POST /auth/register', AuthController.prototype.Register],
    [
      'POST /auth/resend-confirmation',
      AuthController.prototype.ResendConfirmation,
    ],
    ['POST /contact-messages', ContactMessagesController.prototype.Create],
    ['POST /direct-inquiries', DirectInquiriesController.prototype.Create],
  ])('%s requires a captcha', (_route, handler) => {
    expect(GuardsOf(handler)).toContain(TurnstileGuard);
  });

  it('leaves login and the refresh flow to rate limiting and lockout', () => {
    expect(GuardsOf(AuthController.prototype.Login)).not.toContain(
      TurnstileGuard,
    );
    expect(GuardsOf(AuthController.prototype.Refresh)).not.toContain(
      TurnstileGuard,
    );
  });
});
