import { VerificationRejectedJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Vaš zahtjev za verifikaciju nije odobren',
    intro: (providerName: string) =>
      `<p>Zdravo ${providerName},</p><p>Vaš zahtjev za verifikaciju je odbijen.</p>`,
    defaultNotes: 'Dodatni detalji nisu navedeni.',
  },
  [Locale.En]: {
    subject: 'Your verification request was not approved',
    intro: (providerName: string) =>
      `<p>Hi ${providerName},</p><p>Your verification request was rejected.</p>`,
    defaultNotes: 'No additional details were provided.',
  },
} satisfies Record<
  Locale,
  { subject: string; intro: (providerName: string) => string; defaultNotes: string }
>;

export function BuildVerificationRejectedEmail(
  payload: VerificationRejectedJobPayload,
): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  const notes = payload.reviewNotes ?? messages.defaultNotes;
  const bodyHtml = `${messages.intro(payload.providerName)}<p>${notes}</p>`;

  return {
    subject: messages.subject,
    html: BuildEmailLayout({ locale: payload.locale, bodyHtml }),
  };
}
