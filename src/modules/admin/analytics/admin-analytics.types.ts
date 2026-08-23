import { RequestStatus } from '../../repair-requests/repair-requests.types';
import { VerificationStatus } from '../../providers/providers.types';
import { City } from '../../cities/entities/city.entity';

export interface AdminAnalytics {
  providersByVerificationStatus: Record<VerificationStatus, number>;
  requestsByStatus: Record<RequestStatus, number>;
  reviews: {
    totalReviews: number;
    averageRating: string | null;
  };
  topCitiesByProviderCount: City[];
}
