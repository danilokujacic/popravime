import { Review } from '../entities/review.entity';
import { ReviewResponseDto } from '../dto/review-response.dto';

export class ReviewResponseMapper {
  static ToDto(this: void, review: Review): ReviewResponseDto {
    const dto = new ReviewResponseDto();
    dto.id = review.id;
    dto.requestId = review.requestId;
    dto.customerId = review.customerId;
    dto.providerId = review.providerId;
    dto.rating = review.rating;
    dto.comment = review.comment;
    dto.providerResponse = review.providerResponse;
    dto.isPublished = review.isPublished;
    dto.createdAt = review.createdAt;
    return dto;
  }
}
