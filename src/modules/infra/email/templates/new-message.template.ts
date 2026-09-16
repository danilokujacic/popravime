import { NewMessageJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Imate novu poruku',
    body: (recipientName: string, senderName: string) =>
      `<p>Zdravo ${recipientName},</p><p>${senderName} vam je poslao novu poruku na Popravime.</p>`,
  },
  [Locale.En]: {
    subject: 'You have a new message',
    body: (recipientName: string, senderName: string) =>
      `<p>Hi ${recipientName},</p><p>${senderName} sent you a new message on Popravime.</p>`,
  },
} satisfies Record<
  Locale,
  { subject: string; body: (recipientName: string, senderName: string) => string }
>;

export function BuildNewMessageEmail(payload: NewMessageJobPayload): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  return {
    subject: messages.subject,
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml: messages.body(payload.recipientName, payload.senderName),
    }),
  };
}
