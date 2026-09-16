import type { ClsService } from 'nestjs-cls';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { EmailQueueService } from '../infra/email/email-queue.service';
import { Notification } from './entities/notification.entity';
import { NotificationType, NotifyInput } from './notifications.types';

const CORRELATION_ID = 'correlation-1';

function BuildInput(overrides?: Partial<NotifyInput>): NotifyInput {
  return {
    userId: 'user-1',
    type: NotificationType.NewOffer,
    messageKey: 'new_offer',
    messageParams: { providerName: 'Test Provider' },
    email: {
      kind: 'welcome',
      payload: { to: 'user@popravime.me', fullName: 'Test User' },
    },
    ...overrides,
  };
}

function BuildNotification(input: NotifyInput): Notification {
  return {
    id: 'notification-1',
    userId: input.userId,
    type: input.type,
    messageKey: input.messageKey,
    messageParams: input.messageParams ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    relatedEntityId: input.relatedEntityId ?? null,
    isRead: false,
  } as Notification;
}

describe('NotificationsService.Notify (outside a transactional context)', () => {
  function BuildService(notification: Notification | Error) {
    const notificationsRepository = {
      Create:
        notification instanceof Error
          ? jest.fn().mockRejectedValue(notification)
          : jest.fn().mockResolvedValue(notification),
    } as unknown as NotificationsRepository;

    const emailQueueService = {
      Enqueue: jest.fn().mockResolvedValue(undefined),
    } as unknown as EmailQueueService;

    const cls = {
      get: jest.fn().mockReturnValue(CORRELATION_ID),
    } as unknown as ClsService;

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof NotificationsService>[3];

    const service = new NotificationsService(
      notificationsRepository,
      emailQueueService,
      cls,
      logger,
    );

    return { service, notificationsRepository, emailQueueService, cls, logger };
  }

  it('persists the notification and enqueues the email immediately as a fallback', async () => {
    const input = BuildInput();
    const notification = BuildNotification(input);
    const { service, notificationsRepository, emailQueueService, logger } =
      BuildService(notification);

    const result = await service.Notify(input);

    expect(result.id).toBe('notification-1');
    expect(notificationsRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', type: input.type }),
    );
    expect(emailQueueService.Enqueue).toHaveBeenCalledWith({
      ...input.email,
      correlationId: CORRELATION_ID,
    });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        emailKind: 'welcome',
        correlationId: CORRELATION_ID,
      }),
      expect.any(String),
    );
  });

  it('never enqueues the email when persisting the notification fails', async () => {
    const failure = new Error('insert failed');
    const { service, emailQueueService } = BuildService(failure);

    await expect(service.Notify(BuildInput())).rejects.toThrow(failure);

    expect(emailQueueService.Enqueue).not.toHaveBeenCalled();
  });
});
