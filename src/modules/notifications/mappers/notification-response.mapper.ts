import { Notification } from '../entities/notification.entity';
import { NotificationResponseDto } from '../dto/notification-response.dto';

export class NotificationResponseMapper {
  static ToDto(
    this: void,
    notification: Notification,
  ): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.userId = notification.userId;
    dto.type = notification.type;
    dto.title = notification.title;
    dto.body = notification.body;
    dto.relatedEntityType = notification.relatedEntityType;
    dto.relatedEntityId = notification.relatedEntityId;
    dto.isRead = notification.isRead;
    dto.createdAt = notification.createdAt;
    return dto;
  }
}
