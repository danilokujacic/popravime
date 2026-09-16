import { BuildNewMessageEmail } from './new-message.template';
import { Locale } from '../../../users/users.types';

describe('BuildNewMessageEmail', () => {
  it('renders Montenegrin copy with the sender name interpolated', () => {
    const result = BuildNewMessageEmail({
      to: 'recipient@popravime.me',
      locale: Locale.Me,
      recipientName: 'Marko',
      senderName: 'Ana',
    });

    expect(result.subject).toBe('Imate novu poruku');
    expect(result.html).toContain('Ana');
  });

  it('renders English copy for the same input', () => {
    const result = BuildNewMessageEmail({
      to: 'recipient@popravime.me',
      locale: Locale.En,
      recipientName: 'Mark',
      senderName: 'Ana',
    });

    expect(result.subject).toBe('You have a new message');
    expect(result.html).toContain('Ana');
  });
});
