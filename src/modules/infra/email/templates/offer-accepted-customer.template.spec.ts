import { BuildOfferAcceptedCustomerEmail } from './offer-accepted-customer.template';
import { Locale } from '../../../users/users.types';

describe('BuildOfferAcceptedCustomerEmail', () => {
  it('renders Montenegrin copy with the provider name interpolated', () => {
    const result = BuildOfferAcceptedCustomerEmail({
      to: 'customer@popravime.me',
      locale: Locale.Me,
      customerName: 'Kupac',
      providerName: 'Ana Servis',
      providerEmail: 'ana@popravime.me',
      providerPhone: '+38267000000',
      providerWebsite: null,
      previewUrl: 'https://popravime.me/dashboard/requests/request-1',
    });

    expect(result.subject).toBe('Prihvatili ste ponudu od Ana Servis');
    expect(result.html).toContain('ana@popravime.me');
  });

  it('renders English copy for the same input', () => {
    const result = BuildOfferAcceptedCustomerEmail({
      to: 'customer@popravime.me',
      locale: Locale.En,
      customerName: 'Customer',
      providerName: 'Ana Repair',
      providerEmail: 'ana@popravime.me',
      providerPhone: null,
      providerWebsite: null,
      previewUrl: 'https://popravime.me/dashboard/requests/request-1',
    });

    expect(result.subject).toBe("You accepted Ana Repair's offer");
    expect(result.html).toContain('ana@popravime.me');
  });
});
