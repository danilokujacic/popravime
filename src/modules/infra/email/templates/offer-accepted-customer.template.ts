import { OfferAcceptedCustomerJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: (providerName: string) => `Prihvatili ste ponudu od ${providerName}`,
    intro: (providerName: string) =>
      `Prihvatili ste ponudu od ${providerName}. Evo kako da ih direktno kontaktirate:`,
    phoneLabel: 'Telefon',
    emailLabel: 'Email',
    websiteLabel: 'Web sajt',
    cta: 'Pogledaj prijavu',
  },
  [Locale.En]: {
    subject: (providerName: string) => `You accepted ${providerName}'s offer`,
    intro: (providerName: string) =>
      `You accepted an offer from ${providerName}. Here's how to reach them directly:`,
    phoneLabel: 'Phone',
    emailLabel: 'Email',
    websiteLabel: 'Website',
    cta: 'View the request',
  },
} satisfies Record<
  Locale,
  {
    subject: (providerName: string) => string;
    intro: (providerName: string) => string;
    phoneLabel: string;
    emailLabel: string;
    websiteLabel: string;
    cta: string;
  }
>;

export function BuildOfferAcceptedCustomerEmail(
  payload: OfferAcceptedCustomerJobPayload,
): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  const phoneLine = payload.providerPhone
    ? `<p>${messages.phoneLabel}: ${payload.providerPhone}</p>`
    : '';
  const emailLine = payload.providerEmail
    ? `<p>${messages.emailLabel}: ${payload.providerEmail}</p>`
    : '';
  const websiteLine = payload.providerWebsite
    ? `<p>${messages.websiteLabel}: ${payload.providerWebsite}</p>`
    : '';
  const bodyHtml = `<p>${messages.intro(payload.providerName)}</p>${phoneLine}${emailLine}${websiteLine}`;

  return {
    subject: messages.subject(payload.providerName),
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml,
      ctaLabel: messages.cta,
      ctaUrl: payload.previewUrl,
    }),
  };
}
