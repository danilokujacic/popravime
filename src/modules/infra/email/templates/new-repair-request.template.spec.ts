import { BuildNewRepairRequestEmail } from './new-repair-request.template';
import { Locale } from '../../../users/users.types';

describe('BuildNewRepairRequestEmail', () => {
  it('renders a localized subject and CTA link in Montenegrin', () => {
    const result = BuildNewRepairRequestEmail({
      to: 'owner@popravime.me',
      locale: Locale.Me,
      providerName: 'Ana Servis',
      categoryName: 'Mobilni telefoni',
      cityName: 'Podgorica',
      previewUrl: 'https://popravime.me/provider/requests/request-1',
    });

    expect(result.subject).toBe(
      'Nova prijava kvara: Mobilni telefoni u gradu Podgorica',
    );
    expect(result.html).toContain(
      'https://popravime.me/provider/requests/request-1',
    );
  });

  it('renders a localized subject and CTA link in English', () => {
    const result = BuildNewRepairRequestEmail({
      to: 'owner@popravime.me',
      locale: Locale.En,
      providerName: 'Ana Repair',
      categoryName: 'Mobile phones',
      cityName: 'Podgorica',
      previewUrl: 'https://popravime.me/provider/requests/request-1',
    });

    expect(result.subject).toBe(
      'New repair request: Mobile phones in Podgorica',
    );
    expect(result.html).toContain(
      'https://popravime.me/provider/requests/request-1',
    );
  });
});
