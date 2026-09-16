import { BuildOfferReceivedEmail } from './offer-received.template';
import { Locale } from '../../../users/users.types';

describe('BuildOfferReceivedEmail', () => {
  it('renders Montenegrin copy with the provider name interpolated', () => {
    const result = BuildOfferReceivedEmail({
      to: 'a@popravime.me',
      locale: Locale.Me,
      customerName: 'Kupac',
      providerName: 'Ana Servis',
      requestId: 'request-1',
    });

    expect(result.subject).toBe('Stigla je nova ponuda za vašu prijavu');
    expect(result.html).toContain('Ana Servis');
  });

  it('renders English copy for the same input', () => {
    const result = BuildOfferReceivedEmail({
      to: 'a@popravime.me',
      locale: Locale.En,
      customerName: 'Customer',
      providerName: 'Ana Repair',
      requestId: 'request-1',
    });

    expect(result.subject).toBe('You received a new repair offer');
    expect(result.html).toContain('Ana Repair');
  });
});
