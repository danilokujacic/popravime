import { VerificationStatus, WorkingHours } from '../providers.types';

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
  phone: string | null;
  email: string | null;
  website: string | null;
  workingHours: WorkingHours | null;
  verificationStatus: VerificationStatus;
  isCertified: boolean;
  averageRating: string | null;
  reviewCount: number;
  createdAt: Date;
}
