import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { ListMessagesFilter } from './messages.types';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class MessagesRepository {
  constructor(
    @InjectRepository(Message)
    private readonly repository: Repository<Message>,
  ) {}

  ListForConversation(filter: ListMessagesFilter): Promise<Message[]> {
    return this.repository.find({
      where: { requestId: filter.requestId, inquiryId: filter.inquiryId },
      order: { createdAt: 'ASC' },
    });
  }

  FindById(id: string): Promise<Message | null> {
    return this.repository.findOne({ where: { id } });
  }

  async Create(message: Partial<Message>): Promise<Message> {
    try {
      const entity = this.repository.create(message);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(message: Message): Promise<Message> {
    try {
      return await this.repository.save(message);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }
}
