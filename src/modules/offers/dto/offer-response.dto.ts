import { OfferStatus, PartsType } from '../offers.types';
import { ProviderResponseDto } from '../../providers/dto/provider-response.dto';
import { CustomerContactDto } from './customer-contact.dto';
import { ProviderContactDto } from './provider-contact.dto';

export class OfferResponseDto {
  id: string;
  requestId: string;
  providerId: string;
  // Contact-free by design — ProviderResponseDto never carries phone/email. See
  // providerContact below for how the customer gets them once the offer is Accepted.
  provider: ProviderResponseDto;
  priceMin: string;
  priceMax: string;
  estimatedDuration: string;
  partsType: PartsType;
  message: string | null;
  status: OfferStatus;
  createdAt: Date;
  // Only set once this specific offer is Accepted, and only in the response to the provider who
  // owns it (or an admin) — see OffersService.ResolveCustomerContactForOffer.
  customerContact: CustomerContactDto | null;
  // Only set once this specific offer is Accepted, and only in the response to the customer who
  // owns the request (or an admin) — see OffersService.ResolveProviderContactForOffer.
  providerContact: ProviderContactDto | null;
}
