import { VerificationStatus } from '../../providers/providers.types';

export class AdminProviderResponseDto {
  id: string;
  businessName: string;
  slug: string;
  address: string;
  cityId: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  approved: boolean;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone: string | null;
}
