import { ContactMessage } from './entities/contact-message.entity';
import {
  ContactMessageStatus,
  CreateContactMessageInput,
  ListContactMessagesFilter,
} from './contact-messages.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IContactMessagesService {
  Create(input: CreateContactMessageInput): Promise<ContactMessage>;
  UpdateStatus(
    id: string,
    adminId: string,
    status: ContactMessageStatus,
  ): Promise<ContactMessage>;
  List(
    filter: ListContactMessagesFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ContactMessage>>;
}
