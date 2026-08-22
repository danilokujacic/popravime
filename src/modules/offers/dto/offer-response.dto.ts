import { OfferStatus, PartsType } from '../offers.types';

export class OfferResponseDto {
  id: string;
  requestId: string;
  providerId: string;
  priceMin: string;
  priceMax: string;
  estimatedDuration: string;
  partsType: PartsType;
  message: string | null;
  status: OfferStatus;
  createdAt: Date;
}
