import { ContactMessage } from '../entities/contact-message.entity';
import { ContactMessageResponseDto } from '../dto/contact-message-response.dto';

export class ContactMessageResponseMapper {
  static ToDto(this: void, message: ContactMessage): ContactMessageResponseDto {
    const dto = new ContactMessageResponseDto();
    dto.id = message.id;
    dto.name = message.name;
    dto.email = message.email;
    dto.subject = message.subject;
    dto.message = message.message;
    dto.status = message.status;
    dto.createdAt = message.createdAt;
    return dto;
  }
}
