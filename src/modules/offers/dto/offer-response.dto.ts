import { OfferStatus, PartsType } from '../offers.types';
import { ProviderResponseDto } from '../../providers/dto/provider-response.dto';
import { CustomerContactDto } from './customer-contact.dto';

export class OfferResponseDto {
  id: string;
  requestId: string;
  providerId: string;
  // The provider's own contact fields (phone/email/website) are already public — same data the
  // directory and provider profile page return — so this is always included, not gated. Lets the
  // customer reach out directly from any offer without a second round trip.
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
}
