import { IsEnum } from 'class-validator';
import { ContactMessageStatus } from '../contact-messages.types';

export class UpdateContactMessageStatusDto {
  @IsEnum(ContactMessageStatus)
  status: ContactMessageStatus;
}
