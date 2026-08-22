import { OfferReceivedJobPayload } from '../email.types';

export function BuildOfferReceivedEmail(payload: OfferReceivedJobPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'You received a new repair offer',
    html: `<p>Hi ${payload.customerName},</p><p>${payload.providerName} sent an offer for your repair request.</p>`,
  };
}
