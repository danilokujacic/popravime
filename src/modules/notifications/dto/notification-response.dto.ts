import {
  NotificationMessageParams,
  NotificationType,
} from '../notifications.types';

export class NotificationResponseDto {
  id: string;
  userId: string;
  type: NotificationType;
  messageKey: string;
  messageParams: NotificationMessageParams | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: Date;
}
