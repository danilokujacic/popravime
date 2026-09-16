import { OfferAcceptedJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Vaša ponuda je prihvaćena',
    intro: (requestId: string) =>
      `Vaša ponuda za prijavu kvara ${requestId} je prihvaćena. Evo kako da kontaktirate klijenta:`,
    phoneLabel: 'Telefon',
    emailLabel: 'Email',
    cta: 'Pogledaj prijavu',
  },
  [Locale.En]: {
    subject: 'Your offer was accepted',
    intro: (requestId: string) =>
      `Your offer for repair request ${requestId} was accepted. Here's how to reach the customer:`,
    phoneLabel: 'Phone',
    emailLabel: 'Email',
    cta: 'View the request',
  },
} satisfies Record<
  Locale,
  {
    subject: string;
    intro: (requestId: string) => string;
    phoneLabel: string;
    emailLabel: string;
    cta: string;
  }
>;

export function BuildOfferAcceptedEmail(payload: OfferAcceptedJobPayload): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  const phoneLine = payload.customerPhone
    ? `<p>${messages.phoneLabel}: ${payload.customerPhone}</p>`
    : '';
  const bodyHtml = `<p>${messages.intro(payload.requestId)}</p><p>${payload.customerName}<br>${messages.emailLabel}: ${payload.customerEmail}</p>${phoneLine}`;

  return {
    subject: messages.subject,
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml,
      ctaLabel: messages.cta,
      ctaUrl: payload.previewUrl,
    }),
  };
}
