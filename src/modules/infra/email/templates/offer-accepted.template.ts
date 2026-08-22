import { OfferAcceptedJobPayload } from '../email.types';

export function BuildOfferAcceptedEmail(payload: OfferAcceptedJobPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'Your offer was accepted',
    html: `<p>Hi ${payload.providerName},</p><p>Your offer for repair request ${payload.requestId} was accepted.</p>`,
  };
}
