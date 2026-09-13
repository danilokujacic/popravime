import { OfferAcceptedJobPayload } from '../email.types';

export function BuildOfferAcceptedEmail(payload: OfferAcceptedJobPayload): {
  subject: string;
  html: string;
} {
  const phoneLine = payload.customerPhone
    ? `<p>Phone: ${payload.customerPhone}</p>`
    : '';
  return {
    subject: 'Your offer was accepted',
    html: `<p>Hi ${payload.providerName},</p><p>Your offer for repair request ${payload.requestId} was accepted. Here's how to reach the customer:</p><p>${payload.customerName}<br>Email: ${payload.customerEmail}</p>${phoneLine}<p><a href="${payload.previewUrl}">View the request</a></p>`,
  };
}
