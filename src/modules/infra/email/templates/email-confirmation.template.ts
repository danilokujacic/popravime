import { EmailConfirmationJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Potvrdite svoj email — Popravime',
    body: (fullName: string) =>
      `<p>Zdravo ${fullName},</p><p>Potvrdite svoj email kako biste dovršili kreiranje Popravime naloga.</p><p>Link ističe uskoro — ako ne radi, zatražite novi sa stranice za prijavu.</p>`,
    cta: 'Potvrdi email',
  },
  [Locale.En]: {
    subject: 'Confirm your email — Popravime',
    body: (fullName: string) =>
      `<p>Hi ${fullName},</p><p>Confirm your email to finish setting up your Popravime account.</p><p>This link will expire soon — if it doesn't work, request a new one from the login page.</p>`,
    cta: 'Confirm my email',
  },
} satisfies Record<
  Locale,
  { subject: string; body: (fullName: string) => string; cta: string }
>;

export function BuildEmailConfirmationEmail(
  payload: EmailConfirmationJobPayload,
): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  return {
    subject: messages.subject,
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml: messages.body(payload.fullName),
      ctaLabel: messages.cta,
      ctaUrl: payload.confirmUrl,
    }),
  };
}
