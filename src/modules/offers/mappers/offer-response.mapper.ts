import { Offer } from '../entities/offer.entity';
import { OfferResponseDto } from '../dto/offer-response.dto';

export class OfferResponseMapper {
  static ToDto(this: void, offer: Offer): OfferResponseDto {
    const dto = new OfferResponseDto();
    dto.id = offer.id;
    dto.requestId = offer.requestId;
    dto.providerId = offer.providerId;
    dto.priceMin = offer.priceMin;
    dto.priceMax = offer.priceMax;
    dto.estimatedDuration = offer.estimatedDuration;
    dto.partsType = offer.partsType;
    dto.message = offer.message;
    dto.status = offer.status;
    dto.createdAt = offer.createdAt;
    return dto;
  }
}
