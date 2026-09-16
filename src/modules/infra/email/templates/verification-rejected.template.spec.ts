import { BuildVerificationRejectedEmail } from './verification-rejected.template';
import { Locale } from '../../../users/users.types';

describe('BuildVerificationRejectedEmail', () => {
  it('renders the review notes in Montenegrin when provided', () => {
    const result = BuildVerificationRejectedEmail({
      to: 'owner@popravime.me',
      locale: Locale.Me,
      providerName: 'Ana Servis',
      reviewNotes: 'Nedostaje dokumentacija',
    });

    expect(result.subject).toBe('Vaš zahtjev za verifikaciju nije odobren');
    expect(result.html).toContain('Nedostaje dokumentacija');
  });

  it('falls back to a localized default note in English when none is provided', () => {
    const result = BuildVerificationRejectedEmail({
      to: 'owner@popravime.me',
      locale: Locale.En,
      providerName: 'Ana Repair',
      reviewNotes: null,
    });

    expect(result.subject).toBe('Your verification request was not approved');
    expect(result.html).toContain('No additional details were provided.');
  });
});
