import { StatusChangeJobPayload } from '../email.types';

export function BuildStatusChangeEmail(payload: StatusChangeJobPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Your repair request status changed',
    html: `<p>Hi ${payload.customerName},</p><p>Your repair request is now: ${payload.status}.</p>`,
  };
}
