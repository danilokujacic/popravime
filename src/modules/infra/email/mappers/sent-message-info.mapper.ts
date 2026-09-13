import SMTPTransport from 'nodemailer/lib/smtp-transport';
import Mail from 'nodemailer/lib/mailer';
import { SendEmailResult } from '../email.types';

function AddressToString(recipient: string | Mail.Address): string {
  return typeof recipient === 'string' ? recipient : recipient.address;
}

export function MapSentMessageInfo(
  info: SMTPTransport.SentMessageInfo,
): SendEmailResult {
  return {
    accepted: info.accepted.map(AddressToString),
    rejected: info.rejected.map(AddressToString),
    messageId: info.messageId ?? null,
  };
}
