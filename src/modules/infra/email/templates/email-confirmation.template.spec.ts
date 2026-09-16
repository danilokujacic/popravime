import { BuildEmailConfirmationEmail } from './email-confirmation.template';
import { Locale } from '../../../users/users.types';

describe('BuildEmailConfirmationEmail', () => {
  it('renders Montenegrin copy with the confirm link', () => {
    const result = BuildEmailConfirmationEmail({
      to: 'a@popravime.me',
      locale: Locale.Me,
      fullName: 'Marko',
      confirmUrl: 'https://popravime.me/confirm-email/abc',
    });

    expect(result.subject).toBe('Potvrdite svoj email — Popravime');
    expect(result.html).toContain('https://popravime.me/confirm-email/abc');
  });

  it('renders English copy for the same input', () => {
    const result = BuildEmailConfirmationEmail({
      to: 'a@popravime.me',
      locale: Locale.En,
      fullName: 'Mark',
      confirmUrl: 'https://popravime.me/confirm-email/abc',
    });

    expect(result.subject).toBe('Confirm your email — Popravime');
    expect(result.html).toContain('https://popravime.me/confirm-email/abc');
  });
});
