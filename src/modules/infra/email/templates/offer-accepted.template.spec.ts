import { BuildOfferAcceptedEmail } from './offer-accepted.template';
import { Locale } from '../../../users/users.types';

describe('BuildOfferAcceptedEmail', () => {
  it('renders Montenegrin copy with the customer contact info', () => {
    const result = BuildOfferAcceptedEmail({
      to: 'owner@popravime.me',
      locale: Locale.Me,
      providerName: 'Ana Servis',
      requestId: 'request-1',
      customerName: 'Kupac',
      customerEmail: 'kupac@popravime.me',
      customerPhone: '+38267000000',
      previewUrl: 'https://popravime.me/provider/requests/request-1',
    });

    expect(result.subject).toBe('Vaša ponuda je prihvaćena');
    expect(result.html).toContain('+38267000000');
  });

  it('renders English copy for the same input', () => {
    const result = BuildOfferAcceptedEmail({
      to: 'owner@popravime.me',
      locale: Locale.En,
      providerName: 'Ana Repair',
      requestId: 'request-1',
      customerName: 'Customer',
      customerEmail: 'customer@popravime.me',
      customerPhone: null,
      previewUrl: 'https://popravime.me/provider/requests/request-1',
    });

    expect(result.subject).toBe('Your offer was accepted');
    expect(result.html).toContain('customer@popravime.me');
  });
});
