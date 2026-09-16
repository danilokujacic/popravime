import { BuildStatusChangeEmail } from './status-change.template';
import { Locale } from '../../../users/users.types';
import { RequestStatus } from '../../../repair-requests/repair-requests.types';

describe('BuildStatusChangeEmail', () => {
  it('renders a localized status label in Montenegrin', () => {
    const result = BuildStatusChangeEmail({
      to: 'customer@popravime.me',
      locale: Locale.Me,
      customerName: 'Kupac',
      status: RequestStatus.InProgress,
      requestId: 'request-1',
    });

    expect(result.subject).toBe('Status vaše prijave kvara je promijenjen');
    expect(result.html).toContain('u toku');
  });

  it('renders a localized status label in English for the same status', () => {
    const result = BuildStatusChangeEmail({
      to: 'customer@popravime.me',
      locale: Locale.En,
      customerName: 'Customer',
      status: RequestStatus.InProgress,
      requestId: 'request-1',
    });

    expect(result.subject).toBe('Your repair request status changed');
    expect(result.html).toContain('in progress');
  });
});
