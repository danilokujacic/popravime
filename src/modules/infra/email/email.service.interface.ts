import { SendEmailInput, SendEmailResult } from './email.types';

export interface EmailService {
  Send(input: SendEmailInput): Promise<SendEmailResult>;
}
