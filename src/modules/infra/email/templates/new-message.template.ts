import { NewMessageJobPayload } from '../email.types';

export function BuildNewMessageEmail(payload: NewMessageJobPayload): {
  subject: string;
  html: string;
} {
  return {
    subject: 'You have a new message',
    html: `<p>Hi ${payload.recipientName},</p><p>${payload.senderName} sent you a new message on Popravime.</p>`,
  };
}
