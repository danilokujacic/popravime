import { BuildNewInquiryEmail } from './new-inquiry.template';
import { Locale } from '../../../users/users.types';

describe('BuildNewInquiryEmail', () => {
  it('renders Montenegrin copy with the sender name interpolated', () => {
    const result = BuildNewInquiryEmail({
      to: 'owner@popravime.me',
      locale: Locale.Me,
      providerName: 'Ana Servis',
      senderName: 'Marko',
    });

    expect(result.subject).toBe('Dobili ste novi upit');
    expect(result.html).toContain('Marko');
  });

  it('renders English copy for the same input', () => {
    const result = BuildNewInquiryEmail({
      to: 'owner@popravime.me',
      locale: Locale.En,
      providerName: 'Ana Repair',
      senderName: 'Mark',
    });

    expect(result.subject).toBe('You received a new inquiry');
    expect(result.html).toContain('Mark');
  });
});
