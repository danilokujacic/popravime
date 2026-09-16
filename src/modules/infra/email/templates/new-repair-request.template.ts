import { NewRepairRequestJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: (categoryName: string, cityName: string) =>
      `Nova prijava kvara: ${categoryName} u gradu ${cityName}`,
    body: (providerName: string, categoryName: string, cityName: string) =>
      `<p>Zdravo ${providerName},</p><p>Postavljena je nova prijava kvara u kategoriji ${categoryName} (${cityName}) koja odgovara kategorijama koje pružate.</p>`,
    cta: 'Pogledaj prijavu',
  },
  [Locale.En]: {
    subject: (categoryName: string, cityName: string) =>
      `New repair request: ${categoryName} in ${cityName}`,
    body: (providerName: string, categoryName: string, cityName: string) =>
      `<p>Hi ${providerName},</p><p>A new repair request was posted in ${categoryName} (${cityName}) that matches the categories you service.</p>`,
    cta: 'View the request',
  },
} satisfies Record<
  Locale,
  {
    subject: (categoryName: string, cityName: string) => string;
    body: (providerName: string, categoryName: string, cityName: string) => string;
    cta: string;
  }
>;

export function BuildNewRepairRequestEmail(
  payload: NewRepairRequestJobPayload,
): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];

  return {
    subject: messages.subject(payload.categoryName, payload.cityName),
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml: messages.body(
        payload.providerName,
        payload.categoryName,
        payload.cityName,
      ),
      ctaLabel: messages.cta,
      ctaUrl: payload.previewUrl,
    }),
  };
}
