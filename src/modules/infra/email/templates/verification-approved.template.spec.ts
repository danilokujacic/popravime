import { BuildVerificationApprovedEmail } from './verification-approved.template';
import { Locale } from '../../../users/users.types';

describe('BuildVerificationApprovedEmail', () => {
  it('renders Montenegrin copy with the provider name interpolated', () => {
    const result = BuildVerificationApprovedEmail({
      to: 'owner@popravime.me',
      locale: Locale.Me,
      providerName: 'Ana Servis',
    });

    expect(result.subject).toBe('Vaš servis je sada sertifikovan');
    expect(result.html).toContain('Ana Servis');
  });

  it('renders English copy for the same input', () => {
    const result = BuildVerificationApprovedEmail({
      to: 'owner@popravime.me',
      locale: Locale.En,
      providerName: 'Ana Repair',
    });

    expect(result.subject).toBe('Your service is now certified');
    expect(result.html).toContain('Ana Repair');
  });
});
