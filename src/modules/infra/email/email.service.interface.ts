import { SendEmailInput } from './email.types';

export interface EmailService {
  Send(input: SendEmailInput): Promise<void>;
}
