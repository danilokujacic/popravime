import { VerificationStatus, WorkingHours } from '../providers.types';

// Deliberately excludes phone/email: those are direct contact channels and stay private until
// a customer has an Accepted offer with this provider — see ProviderContactDto and
// OffersService.ResolveProviderContactForOffer. Never add phone/email back here; add them to
// ProviderOwnerResponseDto instead if a provider-owner-only view needs them.
export class ProviderResponseDto {
  id: string;
  ownerUserId: string;
  businessName: string;
  slug: string;
  description: string | null;
  address: string;
  cityId: string;
  latitude: string | null;
  longitude: string | null;
  website: string | null;
  workingHours: WorkingHours | null;
  verificationStatus: VerificationStatus;
  isCertified: boolean;
  averageRating: string | null;
  reviewCount: number;
  createdAt: Date;
}
