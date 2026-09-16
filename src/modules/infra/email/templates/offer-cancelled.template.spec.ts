import { BuildOfferCancelledEmail } from './offer-cancelled.template';
import { Locale } from '../../../users/users.types';

describe('BuildOfferCancelledEmail', () => {
  it('renders Montenegrin copy with the provider name interpolated', () => {
    const result = BuildOfferCancelledEmail({
      to: 'owner@popravime.me',
      locale: Locale.Me,
      providerName: 'Ana Servis',
      requestId: 'request-1',
    });

    expect(result.subject).toBe(
      'Klijent više ne sarađuje sa vama na ovoj prijavi',
    );
    expect(result.html).toContain('Ana Servis');
  });

  it('renders English copy for the same input', () => {
    const result = BuildOfferCancelledEmail({
      to: 'owner@popravime.me',
      locale: Locale.En,
      providerName: 'Ana Repair',
      requestId: 'request-1',
    });

    expect(result.subject).toBe(
      'The customer is no longer working with you on this repair',
    );
    expect(result.html).toContain('Ana Repair');
  });
});
