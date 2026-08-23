import { ContactMessageStatus } from '../contact-messages.types';

export class ContactMessageResponseDto {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: Date;
}
