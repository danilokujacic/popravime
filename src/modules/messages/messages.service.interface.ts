import { Message } from './entities/message.entity';
import { CreateMessageInput, ListMessagesFilter } from './messages.types';

export interface IMessagesService {
  Create(senderId: string, input: CreateMessageInput): Promise<Message>;
  ListForConversation(
    filter: ListMessagesFilter,
    userId: string,
  ): Promise<Message[]>;
  MarkRead(id: string, userId: string): Promise<Message>;
}
