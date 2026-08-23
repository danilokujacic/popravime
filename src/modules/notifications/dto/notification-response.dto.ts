import { NotificationType } from '../notifications.types';

export class NotificationResponseDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  createdAt: Date;
}
