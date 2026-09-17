import { Offer } from '../entities/offer.entity';
import { OfferResponseDto } from '../dto/offer-response.dto';
import { CustomerContactDto } from '../dto/customer-contact.dto';
import { ProviderContactDto } from '../dto/provider-contact.dto';
import { ProviderResponseMapper } from '../../providers/mappers/provider-response.mapper';

export class OfferResponseMapper {
  static ToDto(
    this: void,
    offer: Offer,
    customerContact: CustomerContactDto | null = null,
    providerContact: ProviderContactDto | null = null,
  ): OfferResponseDto {
    const dto = new OfferResponseDto();
    dto.id = offer.id;
    dto.requestId = offer.requestId;
    dto.providerId = offer.providerId;
    dto.provider = ProviderResponseMapper.ToDto(offer.provider);
    dto.priceMin = offer.priceMin;
    dto.priceMax = offer.priceMax;
    dto.estimatedDuration = offer.estimatedDuration;
    dto.partsType = offer.partsType;
    dto.message = offer.message;
    dto.status = offer.status;
    dto.createdAt = offer.createdAt;
    dto.customerContact = customerContact;
    dto.providerContact = providerContact;
    return dto;
  }
}
