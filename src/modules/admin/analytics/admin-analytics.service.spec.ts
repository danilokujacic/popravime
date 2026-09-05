import { AdminAnalyticsService } from './admin-analytics.service';
import { ProvidersService } from '../../providers/providers.service';
import { RepairRequestsService } from '../../repair-requests/repair-requests.service';
import { ReviewsService } from '../../reviews/reviews.service';
import { CitiesService } from '../../cities/cities.service';
import { VerificationStatus } from '../../providers/providers.types';
import { RequestStatus } from '../../repair-requests/repair-requests.types';
import { City } from '../../cities/entities/city.entity';

function BuildCity(overrides?: Partial<City>): City {
  return {
    id: 'city-1',
    name: 'Podgorica',
    providerCount: 12,
    ...overrides,
  } as City;
}

describe('AdminAnalyticsService.Overview', () => {
  function BuildService() {
    const providersService = {
      CountByVerificationStatus: jest.fn().mockResolvedValue({
        [VerificationStatus.Pending]: 2,
        [VerificationStatus.Verified]: 5,
        [VerificationStatus.Rejected]: 1,
      }),
    } as unknown as ProvidersService;

    const repairRequestsService = {
      CountByStatus: jest.fn().mockResolvedValue({
        [RequestStatus.PendingReview]: 1,
        [RequestStatus.Open]: 3,
        [RequestStatus.OffersReceived]: 1,
        [RequestStatus.Accepted]: 0,
        [RequestStatus.InProgress]: 2,
        [RequestStatus.Completed]: 4,
        [RequestStatus.Cancelled]: 0,
        [RequestStatus.Rejected]: 0,
      }),
    } as unknown as RepairRequestsService;

    const reviewsService = {
      OverallStats: jest
        .fn()
        .mockResolvedValue({ totalReviews: 10, averageRating: '4.50' }),
    } as unknown as ReviewsService;

    const citiesService = {
      TopByProviderCount: jest.fn().mockResolvedValue([BuildCity()]),
    } as unknown as CitiesService;

    const service = new AdminAnalyticsService(
      providersService,
      repairRequestsService,
      reviewsService,
      citiesService,
    );

    return { service, citiesService };
  }

  it('composes analytics from all four collaborator services', async () => {
    const { service, citiesService } = BuildService();

    const result = await service.Overview();

    expect(
      result.providersByVerificationStatus[VerificationStatus.Verified],
    ).toBe(5);
    expect(result.requestsByStatus[RequestStatus.Completed]).toBe(4);
    expect(result.reviews).toEqual({ totalReviews: 10, averageRating: '4.50' });
    expect(result.topCitiesByProviderCount).toEqual([BuildCity()]);
    expect(citiesService.TopByProviderCount).toHaveBeenCalledWith(5);
  });
});
