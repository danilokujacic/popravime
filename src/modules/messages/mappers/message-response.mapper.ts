import { Message } from '../entities/message.entity';
import { MessageResponseDto } from '../dto/message-response.dto';

export class MessageResponseMapper {
  static ToDto(this: void, message: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = message.id;
    dto.requestId = message.requestId;
    dto.inquiryId = message.inquiryId;
    dto.senderId = message.senderId;
    dto.body = message.body;
    dto.attachmentUrl = message.attachmentUrl;
    dto.isRead = message.isRead;
    dto.createdAt = message.createdAt;
    return dto;
  }
}
