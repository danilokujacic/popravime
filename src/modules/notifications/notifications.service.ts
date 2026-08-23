import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { runOnTransactionCommit } from 'typeorm-transactional';
import { NotificationsRepository } from './notifications.repository';
import { Notification } from './entities/notification.entity';
import { NotifyInput } from './notifications.types';
import { INotificationsService } from './notifications.service.interface';
import { EmailQueueService } from '../infra/email/email-queue.service';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';

@Injectable()
export class NotificationsService implements INotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly emailQueueService: EmailQueueService,
    @InjectPinoLogger(NotificationsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Notify(input: NotifyInput): Promise<Notification> {
    const notification = await this.notificationsRepository.Create({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
    });

    this.EnqueueEmailOnCommit(input.email);

    this.logger.info(
      {
        notificationId: notification.id,
        userId: input.userId,
        type: input.type,
      },
      'Notification sent',
    );

    return notification;
  }

  private EnqueueEmailOnCommit(email: NotifyInput['email']): void {
    try {
      runOnTransactionCommit(() => {
        void this.emailQueueService.Enqueue(email);
      });
    } catch {
      this.logger.warn(
        { emailKind: email.kind },
        'Notify called outside a transactional context, enqueueing immediately',
      );
      void this.emailQueueService.Enqueue(email);
    }
  }

  ListForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Notification>> {
    return this.notificationsRepository.ListForUser(userId, page, limit);
  }

  async MarkRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    const notification =
      await this.notificationsRepository.FindById(notificationId);
    if (!notification) {
      throw new DomainNotFoundException(
        'NOTIFICATION_NOT_FOUND',
        'Notification not found',
      );
    }
    if (notification.userId !== userId) {
      throw new DomainForbiddenException(
        'NOTIFICATION_NOT_OWNED',
        'You do not own this notification',
      );
    }

    notification.isRead = true;
    return this.notificationsRepository.Save(notification);
  }
}
