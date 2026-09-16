import { WelcomeJobPayload } from '../email.types';
import { Locale } from '../../../users/users.types';
import { BuildEmailLayout } from './shared/email-layout';

const MESSAGES = {
  [Locale.Me]: {
    subject: 'Dobrodošli na Popravime',
    body: (fullName: string) =>
      `<p>Zdravo ${fullName},</p><p>Vaš Popravime nalog je spreman.</p>`,
  },
  [Locale.En]: {
    subject: 'Welcome to Popravime',
    body: (fullName: string) =>
      `<p>Hi ${fullName},</p><p>Your Popravime account is ready.</p>`,
  },
} satisfies Record<Locale, { subject: string; body: (fullName: string) => string }>;

export function BuildWelcomeEmail(payload: WelcomeJobPayload): {
  subject: string;
  html: string;
} {
  const messages = MESSAGES[payload.locale];
  return {
    subject: messages.subject,
    html: BuildEmailLayout({
      locale: payload.locale,
      bodyHtml: messages.body(payload.fullName),
    }),
  };
}
