import { FaqItem } from '../entities/faq-item.entity';
import { FaqItemResponseDto } from '../dto/faq-item-response.dto';

export class FaqItemResponseMapper {
  static ToDto(this: void, item: FaqItem): FaqItemResponseDto {
    const dto = new FaqItemResponseDto();
    dto.id = item.id;
    dto.question = item.question;
    dto.answer = item.answer;
    dto.category = item.category;
    dto.sortOrder = item.sortOrder;
    return dto;
  }
}
