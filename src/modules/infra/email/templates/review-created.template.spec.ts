import { BuildReviewCreatedEmail } from './review-created.template';
import { Locale } from '../../../users/users.types';

describe('BuildReviewCreatedEmail', () => {
  it('renders Montenegrin copy with the rating interpolated', () => {
    const result = BuildReviewCreatedEmail({
      to: 'owner@popravime.me',
      locale: Locale.Me,
      providerName: 'Ana Servis',
      rating: 5,
      requestId: 'request-1',
    });

    expect(result.subject).toBe('Dobili ste novu recenziju');
    expect(result.html).toContain('5/5');
  });

  it('renders English copy for the same input', () => {
    const result = BuildReviewCreatedEmail({
      to: 'owner@popravime.me',
      locale: Locale.En,
      providerName: 'Ana Repair',
      rating: 5,
      requestId: 'request-1',
    });

    expect(result.subject).toBe('You received a new review');
    expect(result.html).toContain('5-star');
  });
});
