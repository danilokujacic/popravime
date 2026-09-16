import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from 'typeorm-transactional';
import { MessagesRepository } from './messages.repository';
import { Message } from './entities/message.entity';
import type { CreateMessageInput, ListMessagesFilter } from './messages.types';
import { IMessagesService } from './messages.service.interface';
import { RepairRequestsService } from '../repair-requests/repair-requests.service';
import { OffersService } from '../offers/offers.service';
import { DirectInquiriesService } from '../direct-inquiries/direct-inquiries.service';
import { ProvidersService } from '../providers/providers.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import type { StorageService } from '../infra/storage/storage.service.interface';
import { STORAGE_SERVICE } from '../../common/constants/di-tokens';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainValidationException } from '../../common/exceptions/validation.exception';

type ConversationRef =
  { kind: 'request'; id: string } | { kind: 'inquiry'; id: string };

@Injectable()
export class MessagesService implements IMessagesService {
  constructor(
    private readonly messagesRepository: MessagesRepository,
    private readonly repairRequestsService: RepairRequestsService,
    private readonly offersService: OffersService,
    private readonly directInquiriesService: DirectInquiriesService,
    private readonly providersService: ProvidersService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @InjectPinoLogger(MessagesService.name)
    private readonly logger: PinoLogger,
  ) {}

  @Transactional()
  async Create(senderId: string, input: CreateMessageInput): Promise<Message> {
    const ref = this.ResolveConversationRef(input.requestId, input.inquiryId);
    const participants = await this.ResolveParticipants(ref);
    this.EnsureParticipant(participants, senderId);

    const attachmentUrl = await this.ResolveAttachmentUrl(input.attachment);

    const message = await this.messagesRepository.Create({
      requestId: input.requestId ?? null,
      inquiryId: input.inquiryId ?? null,
      senderId,
      body: input.body,
      attachmentUrl,
    });

    await this.NotifyOtherParticipant(participants, senderId, message);

    this.logger.info(
      { messageId: message.id, senderId, kind: ref.kind },
      'Message sent',
    );

    return message;
  }

  async ListForConversation(
    filter: ListMessagesFilter,
    userId: string,
  ): Promise<Message[]> {
    const ref = this.ResolveConversationRef(filter.requestId, filter.inquiryId);
    const participants = await this.ResolveParticipants(ref);
    this.EnsureParticipant(participants, userId);

    return this.messagesRepository.ListForConversation(filter);
  }

  async MarkRead(id: string, userId: string): Promise<Message> {
    const message = await this.GetOrThrow(id);
    const participants = await this.ResolveParticipants(
      this.ToConversationRef(message),
    );
    this.EnsureParticipant(participants, userId);

    message.isRead = true;
    const saved = await this.messagesRepository.Save(message);

    this.logger.info({ messageId: id, userId }, 'Message marked as read');

    return saved;
  }

  private async NotifyOtherParticipant(
    participants: string[],
    senderId: string,
    message: Message,
  ): Promise<void> {
    const recipientId = participants.find(
      (participantId) => participantId !== senderId,
    );
    if (!recipientId) {
      return;
    }

    const [sender, recipient] = await Promise.all([
      this.usersService.FindById(senderId),
      this.usersService.FindById(recipientId),
    ]);

    await this.notificationsService.Notify({
      userId: recipient.id,
      type: NotificationType.NewMessage,
      messageKey: 'new_message',
      messageParams: { senderName: sender.fullName },
      relatedEntityType: 'message',
      relatedEntityId: message.id,
      email: {
        kind: 'new-message',
        payload: {
          to: recipient.email,
          locale: recipient.locale,
          recipientName: recipient.fullName,
          senderName: sender.fullName,
        },
      },
    });
  }

  private async ResolveAttachmentUrl(
    attachment: CreateMessageInput['attachment'],
  ): Promise<string | null> {
    if (!attachment) {
      return null;
    }
    const uploaded = await this.storageService.Upload(attachment);
    return uploaded.url;
  }

  private async ResolveParticipants(ref: ConversationRef): Promise<string[]> {
    if (ref.kind === 'request') {
      return this.ResolveRequestParticipants(ref.id);
    }
    return this.ResolveInquiryParticipants(ref.id);
  }

  private async ResolveRequestParticipants(
    requestId: string,
  ): Promise<string[]> {
    const request = await this.repairRequestsService.FindById(requestId);
    if (!request.acceptedOfferId) {
      throw new DomainConflictException(
        'NO_ACCEPTED_OFFER',
        'Messaging is available once an offer has been accepted for this request',
      );
    }

    const offer = await this.offersService.FindById(request.acceptedOfferId);
    const provider = await this.providersService.FindById(offer.providerId);

    return [request.customerId, provider.ownerUserId];
  }

  private async ResolveInquiryParticipants(
    inquiryId: string,
  ): Promise<string[]> {
    const inquiry = await this.directInquiriesService.Get(inquiryId);
    const provider = await this.providersService.FindById(inquiry.providerId);

    const participants = [provider.ownerUserId];
    if (inquiry.customerId) {
      participants.push(inquiry.customerId);
    }

    return participants;
  }

  private ResolveConversationRef(
    requestId: string | undefined,
    inquiryId: string | undefined,
  ): ConversationRef {
    if (requestId && !inquiryId) {
      return { kind: 'request', id: requestId };
    }
    if (inquiryId && !requestId) {
      return { kind: 'inquiry', id: inquiryId };
    }
    throw new DomainValidationException(
      'EXACTLY_ONE_CONVERSATION_REQUIRED',
      'Provide exactly one of request_id or inquiry_id',
    );
  }

  private ToConversationRef(message: Message): ConversationRef {
    if (message.requestId) {
      return { kind: 'request', id: message.requestId };
    }
    if (message.inquiryId) {
      return { kind: 'inquiry', id: message.inquiryId };
    }
    throw new DomainConflictException(
      'MESSAGE_MISSING_CONVERSATION',
      'Message has no associated conversation',
    );
  }

  private EnsureParticipant(participants: string[], userId: string): void {
    if (!participants.includes(userId)) {
      throw new DomainForbiddenException(
        'NOT_A_PARTICIPANT',
        'You are not a participant in this conversation',
      );
    }
  }

  private async GetOrThrow(id: string): Promise<Message> {
    const message = await this.messagesRepository.FindById(id);
    if (!message) {
      throw new DomainNotFoundException(
        'MESSAGE_NOT_FOUND',
        'Message not found',
      );
    }
    return message;
  }
}
