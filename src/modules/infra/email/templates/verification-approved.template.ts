import { VerificationApprovedJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Vaš servis je sada sertifikovan',
    body: (providerName: string) =>
      `<p>Zdravo ${providerName},</p><p>Vaš zahtjev za verifikaciju je odobren. Vaš profil sada prikazuje oznaku Sertifikovan servis.</p>`,
  },
  [Locale.En]: {
    subject: 'Your service is now certified',
    body: (providerName: string) =>
      `<p>Hi ${providerName},</p><p>Your verification request was approved. Your profile now shows the Certified Service badge.</p>`,
  },
} satisfies Record<Locale, { subject: string; body: (providerName: string) => string }>;

export function BuildVerificationApprovedEmail(
  payload: VerificationApprovedJobPayload,
): {
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
