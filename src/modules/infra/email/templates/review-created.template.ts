import { ReviewCreatedJobPayload } from '../email.types';

export function BuildReviewCreatedEmail(payload: ReviewCreatedJobPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'You received a new review',
    html: `<p>Hi ${payload.providerName},</p><p>You received a ${payload.rating}-star review for repair request ${payload.requestId}.</p>`,
  };
}
