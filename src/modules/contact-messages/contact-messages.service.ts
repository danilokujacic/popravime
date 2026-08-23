import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContactMessagesRepository } from './contact-messages.repository';
import { ContactMessage } from './entities/contact-message.entity';
import {
  ContactMessageStatus,
  CreateContactMessageInput,
  ListContactMessagesFilter,
} from './contact-messages.types';
import { IContactMessagesService } from './contact-messages.service.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

@Injectable()
export class ContactMessagesService implements IContactMessagesService {
  constructor(
    private readonly contactMessagesRepository: ContactMessagesRepository,
    @InjectPinoLogger(ContactMessagesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Create(input: CreateContactMessageInput): Promise<ContactMessage> {
    const message = await this.contactMessagesRepository.Create({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
    });

    this.logger.info(
      { contactMessageId: message.id },
      'Contact message received',
    );

    return message;
  }

  async UpdateStatus(
    id: string,
    status: ContactMessageStatus,
  ): Promise<ContactMessage> {
    const message = await this.GetOrThrow(id);
    message.status = status;

    const saved = await this.contactMessagesRepository.Save(message);
    this.logger.info(
      { contactMessageId: id, status },
      'Contact message status changed',
    );

    return saved;
  }

  List(
    filter: ListContactMessagesFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<ContactMessage>> {
    return this.contactMessagesRepository.List(filter, page, limit);
  }

  private async GetOrThrow(id: string): Promise<ContactMessage> {
    const message = await this.contactMessagesRepository.FindById(id);
    if (!message) {
      throw new DomainNotFoundException(
        'CONTACT_MESSAGE_NOT_FOUND',
        'Contact message not found',
      );
    }
    return message;
  }
}
