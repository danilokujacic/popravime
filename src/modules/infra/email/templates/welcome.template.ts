import { WelcomeJobPayload } from '../email.types';

export function BuildWelcomeEmail(payload: WelcomeJobPayload): { subject: string; html: string } {
  return {
    subject: 'Welcome to Popravime',
    html: `<p>Hi ${payload.fullName},</p><p>Your Popravime account is ready.</p>`,
  };
}
