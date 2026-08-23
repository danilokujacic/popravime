import { NewInquiryJobPayload } from '../email.types';

export function BuildNewInquiryEmail(payload: NewInquiryJobPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'You received a new inquiry',
    html: `<p>Hi ${payload.providerName},</p><p>${payload.senderName} sent you an inquiry on Popravime.</p>`,
  };
}
