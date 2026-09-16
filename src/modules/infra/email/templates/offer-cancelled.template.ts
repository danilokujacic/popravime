import { OfferCancelledJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Klijent više ne sarađuje sa vama na ovoj prijavi',
    body: (providerName: string) =>
      `<p>Zdravo ${providerName},</p><p>Klijent je ponovo otvorio svoju prijavu kvara i više ne sarađuje sa vama na njoj. Slobodno pošaljite novu ponudu ako ste i dalje zainteresovani.</p>`,
  },
  [Locale.En]: {
    subject: 'The customer is no longer working with you on this repair',
    body: (providerName: string) =>
      `<p>Hi ${providerName},</p><p>The customer reopened their repair request and is no longer working with you on it. You're welcome to submit a new offer if you're still interested.</p>`,
  },
} satisfies Record<Locale, { subject: string; body: (providerName: string) => string }>;

export function BuildOfferCancelledEmail(payload: OfferCancelledJobPayload): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  return {
    subject: messages.subject,
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml: messages.body(payload.providerName),
    }),
  };
}
