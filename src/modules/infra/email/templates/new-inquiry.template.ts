import { NewInquiryJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Dobili ste novi upit',
    body: (providerName: string, senderName: string) =>
      `<p>Zdravo ${providerName},</p><p>${senderName} vam je poslao upit na Popravime.</p>`,
  },
  [Locale.En]: {
    subject: 'You received a new inquiry',
    body: (providerName: string, senderName: string) =>
      `<p>Hi ${providerName},</p><p>${senderName} sent you an inquiry on Popravime.</p>`,
  },
} satisfies Record<
  Locale,
  { subject: string; body: (providerName: string, senderName: string) => string }
>;

export function BuildNewInquiryEmail(payload: NewInquiryJobPayload): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  return {
    subject: messages.subject,
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml: messages.body(payload.providerName, payload.senderName),
    }),
  };
}
