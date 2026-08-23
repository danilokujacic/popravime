import { AdminAnalytics } from '../analytics/admin-analytics.types';
import { AdminAnalyticsResponseDto } from '../dto/admin-analytics-response.dto';
import { CityResponseMapper } from '../../cities/mappers/city-response.mapper';

export class AdminAnalyticsResponseMapper {
  static ToDto(
    this: void,
    analytics: AdminAnalytics,
  ): AdminAnalyticsResponseDto {
    const dto = new AdminAnalyticsResponseDto();
    dto.providersByVerificationStatus = analytics.providersByVerificationStatus;
    dto.requestsByStatus = analytics.requestsByStatus;
    dto.reviews = analytics.reviews;
    dto.topCitiesByProviderCount = analytics.topCitiesByProviderCount.map(
      CityResponseMapper.ToDto,
    );
    return dto;
  }
}
