import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ContactMessagesRepository } from './contact-messages.repository';
import { ContactMessage } from './entities/contact-message.entity';
import {
  ContactMessageStatus,
  CreateContactMessageInput,
  ListContactMessagesFilter,
} from './contact-messages.types';
import { IContactMessagesService } from './contact-messages.service.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { legalConfig } from '../../config/legal.config';

@Injectable()
export class ContactMessagesService implements IContactMessagesService {
  constructor(
    private readonly contactMessagesRepository: ContactMessagesRepository,
    private readonly auditLogsService: AuditLogsService,
    @Inject(legalConfig.KEY)
    private readonly legal: ConfigType<typeof legalConfig>,
    @InjectPinoLogger(ContactMessagesService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Create(input: CreateContactMessageInput): Promise<ContactMessage> {
    const message = await this.contactMessagesRepository.Create({
      name: input.name,
      email: input.email,
      subject: input.subject,
      message: input.message,
      termsAcceptedAt: new Date(),
      termsVersion: this.legal.termsVersion,
    });

    this.logger.info(
      { contactMessageId: message.id },
      'Contact message received',
    );

    return message;
  }

  async UpdateStatus(
    id: string,
    adminId: string,
    status: ContactMessageStatus,
  ): Promise<ContactMessage> {
    const message = await this.GetOrThrow(id);
    message.status = status;

    const saved = await this.contactMessagesRepository.Save(message);
    await this.auditLogsService.Log({
      actorId: adminId,
      action: 'contact_message.status_changed',
      entityType: 'contact_message',
      entityId: id,
      metadata: { status },
    });
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
