import { EmailConfirmationJobPayload } from '../email.types';

export function BuildEmailConfirmationEmail(
  payload: EmailConfirmationJobPayload,
): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Confirm your email — Popravime',
    html: `<p>Hi ${payload.fullName},</p><p>Confirm your email to finish setting up your Popravime account.</p><p><a href="${payload.confirmUrl}">Confirm my email</a></p><p>This link will expire soon — if it doesn't work, request a new one from the login page.</p>`,
  };
}
