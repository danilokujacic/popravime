import { Injectable } from '@nestjs/common';
import { ProvidersService } from '../../providers/providers.service';
import { RepairRequestsService } from '../../repair-requests/repair-requests.service';
import { ReviewsService } from '../../reviews/reviews.service';
import { CitiesService } from '../../cities/cities.service';
import { AdminAnalytics } from './admin-analytics.types';

const TOP_CITIES_LIMIT = 5;

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly repairRequestsService: RepairRequestsService,
    private readonly reviewsService: ReviewsService,
    private readonly citiesService: CitiesService,
  ) {}

  async Overview(): Promise<AdminAnalytics> {
    const [
      providersByVerificationStatus,
      requestsByStatus,
      reviews,
      topCitiesByProviderCount,
    ] = await Promise.all([
      this.providersService.CountByVerificationStatus(),
      this.repairRequestsService.CountByStatus(),
      this.reviewsService.OverallStats(),
      this.citiesService.TopByProviderCount(TOP_CITIES_LIMIT),
    ]);

    return {
      providersByVerificationStatus,
      requestsByStatus,
      reviews,
      topCitiesByProviderCount,
    };
  }
}
