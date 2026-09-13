import { OfferAcceptedCustomerJobPayload } from '../email.types';

export function BuildOfferAcceptedCustomerEmail(
  payload: OfferAcceptedCustomerJobPayload,
): {
  subject: string;
  html: string;
} {
  const phoneLine = payload.providerPhone
    ? `<p>Phone: ${payload.providerPhone}</p>`
    : '';
  const emailLine = payload.providerEmail
    ? `<p>Email: ${payload.providerEmail}</p>`
    : '';
  const websiteLine = payload.providerWebsite
    ? `<p>Website: ${payload.providerWebsite}</p>`
    : '';
  return {
    subject: `You accepted ${payload.providerName}'s offer`,
    html: `<p>Hi ${payload.customerName},</p><p>You accepted an offer from ${payload.providerName}. Here's how to reach them directly:</p>${phoneLine}${emailLine}${websiteLine}<p><a href="${payload.previewUrl}">View the request</a></p>`,
  };
}
