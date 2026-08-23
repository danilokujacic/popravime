import { VerificationApprovedJobPayload } from '../email.types';

export function BuildVerificationApprovedEmail(
  payload: VerificationApprovedJobPayload,
): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Your service is now certified',
    html: `<p>Hi ${payload.providerName},</p><p>Your verification request was approved. Your profile now shows the Certified Service badge.</p>`,
  };
}
