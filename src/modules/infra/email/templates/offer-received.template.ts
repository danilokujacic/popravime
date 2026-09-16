import { OfferReceivedJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Stigla je nova ponuda za vašu prijavu',
    greeting: (customerName: string) => `Zdravo ${customerName},`,
    body: (providerName: string) =>
      `<strong>${providerName}</strong> je poslao ponudu za vaš prijavljen kvar.`,
    cta: 'Pogledaj ponudu',
  },
  [Locale.En]: {
    subject: 'You received a new repair offer',
    greeting: (customerName: string) => `Hi ${customerName},`,
    body: (providerName: string) =>
      `<strong>${providerName}</strong> sent an offer for your repair request.`,
    cta: 'View offer',
  },
} satisfies Record<
  Locale,
  {
    subject: string;
    greeting: (customerName: string) => string;
    body: (providerName: string) => string;
    cta: string;
  }
>;

export function BuildOfferReceivedEmail(payload: OfferReceivedJobPayload): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  const bodyHtml = `<p>${messages.greeting(payload.customerName)}</p><p>${messages.body(payload.providerName)}</p>`;

  return {
    subject: messages.subject,
    html: BuildEmailLayout({ locale: payload.locale, bodyHtml }),
  };
}
