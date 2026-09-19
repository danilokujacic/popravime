import { EmailJob } from './email.types';

export const CRITICAL_EMAIL_KINDS: ReadonlySet<EmailJob['kind']> = new Set([
  'email-confirmation',
  'offer-accepted',
  'offer-accepted-customer',
]);
