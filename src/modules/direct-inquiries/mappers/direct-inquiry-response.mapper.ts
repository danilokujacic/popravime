import { DirectInquiry } from '../entities/direct-inquiry.entity';
import { DirectInquiryResponseDto } from '../dto/direct-inquiry-response.dto';

export class DirectInquiryResponseMapper {
  static ToDto(this: void, inquiry: DirectInquiry): DirectInquiryResponseDto {
    const dto = new DirectInquiryResponseDto();
    dto.id = inquiry.id;
    dto.customerId = inquiry.customerId;
    dto.providerId = inquiry.providerId;
    dto.name = inquiry.name;
    dto.contactEmail = inquiry.contactEmail;
    dto.contactPhone = inquiry.contactPhone;
    dto.message = inquiry.message;
    dto.status = inquiry.status;
    dto.createdAt = inquiry.createdAt;
    return dto;
  }
}
