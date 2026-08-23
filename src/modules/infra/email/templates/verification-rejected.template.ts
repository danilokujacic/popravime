import { VerificationRejectedJobPayload } from '../email.types';

export function BuildVerificationRejectedEmail(
  payload: VerificationRejectedJobPayload,
): {
  subject: string;
  html: string;
} {
  const notes = payload.reviewNotes ?? 'No additional details were provided.';
  return {
    subject: 'Your verification request was not approved',
    html: `<p>Hi ${payload.providerName},</p><p>Your verification request was rejected.</p><p>${notes}</p>`,
  };
}
