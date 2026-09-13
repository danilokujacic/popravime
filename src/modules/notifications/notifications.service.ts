import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import { runOnTransactionCommit } from 'typeorm-transactional';
import { NotificationsRepository } from './notifications.repository';
import { Notification } from './entities/notification.entity';
import { NotifyInput } from './notifications.types';
import { INotificationsService } from './notifications.service.interface';
import { EmailQueueService } from '../infra/email/email-queue.service';
import { EmailJob } from '../infra/email/email.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { CORRELATION_ID_CLS_KEY } from '../../common/constants/correlation.constants';

@Injectable()
export class NotificationsService implements INotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly emailQueueService: EmailQueueService,
    private readonly cls: ClsService,
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

    // Read now, not inside the deferred commit callback below — this always runs inside the
    // request that called Notify, whereas the callback's own execution context is one more
    // hop removed from it.
    const correlationId =
      this.cls.get<string>(CORRELATION_ID_CLS_KEY) ?? randomUUID();
    this.EnqueueEmailOnCommit({ ...input.email, correlationId });

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

  private EnqueueEmailOnCommit(email: EmailJob): void {
    try {
      runOnTransactionCommit(() => {
        void this.emailQueueService.Enqueue(email);
      });
    } catch {
      this.logger.warn(
        { emailKind: email.kind, correlationId: email.correlationId },
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
