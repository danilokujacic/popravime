import { BuildWelcomeEmail } from './welcome.template';
import { Locale } from '../../../users/users.types';

describe('BuildWelcomeEmail', () => {
  it('renders Montenegrin copy with the full name interpolated', () => {
    const result = BuildWelcomeEmail({
      to: 'a@popravime.me',
      locale: Locale.Me,
      fullName: 'Marko',
    });

    expect(result.subject).toBe('Dobrodošli na Popravime');
    expect(result.html).toContain('Marko');
  });

  it('renders English copy for the same input', () => {
    const result = BuildWelcomeEmail({
      to: 'a@popravime.me',
      locale: Locale.En,
      fullName: 'Mark',
    });

    expect(result.subject).toBe('Welcome to Popravime');
    expect(result.html).toContain('Mark');
  });
});
