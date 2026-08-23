import { Notification } from './entities/notification.entity';
import { NotifyInput } from './notifications.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface INotificationsService {
  Notify(input: NotifyInput): Promise<Notification>;
  ListForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Notification>>;
  MarkRead(notificationId: string, userId: string): Promise<Notification>;
}
