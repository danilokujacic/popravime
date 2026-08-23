import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { ListContactMessagesFilter } from './contact-messages.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class ContactMessagesRepository {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly repository: Repository<ContactMessage>,
  ) {}

  async List(
    filter: ListContactMessagesFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ContactMessage>> {
    const [items, total] = await this.repository.findAndCount({
      where: { status: filter.status },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  FindById(id: string): Promise<ContactMessage | null> {
    return this.repository.findOne({ where: { id } });
  }

  async Create(message: Partial<ContactMessage>): Promise<ContactMessage> {
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

  async Save(message: ContactMessage): Promise<ContactMessage> {
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
