import { RequestStatus } from '../../repair-requests/repair-requests.types';
import { VerificationStatus } from '../../providers/providers.types';
import { CityResponseDto } from '../../cities/dto/city-response.dto';

export class AdminAnalyticsReviewStatsDto {
  totalReviews: number;
  averageRating: string | null;
}

export class AdminAnalyticsResponseDto {
  providersByVerificationStatus: Record<VerificationStatus, number>;
  requestsByStatus: Record<RequestStatus, number>;
  reviews: AdminAnalyticsReviewStatsDto;
  topCitiesByProviderCount: CityResponseDto[];
}
