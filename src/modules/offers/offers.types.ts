export enum PartsType {
  Original = 'original',
  Oem = 'oem',
  Aftermarket = 'aftermarket',
}

export enum OfferStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Withdrawn = 'withdrawn',
  Cancelled = 'cancelled',
}

export interface CreateOfferInput {
  requestId: string;
  providerId: string;
  priceMin: string;
  priceMax: string;
  estimatedDuration: string;
  partsType: PartsType;
  message?: string;
}

export interface ListOffersFilter {
  requestId?: string;
  providerId?: string;
  status?: OfferStatus;
}
