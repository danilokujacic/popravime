import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './reviews.repository';
import { RepairRequestsService } from '../repair-requests/repair-requests.service';
import { OffersService } from '../offers/offers.service';
import { ProvidersService } from '../providers/providers.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestStatus } from '../repair-requests/repair-requests.types';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';
import { Offer } from '../offers/entities/offer.entity';
import { Provider } from '../providers/entities/provider.entity';
import { User } from '../users/entities/user.entity';
import { Review } from './entities/review.entity';
import { UserRole } from '../users/users.types';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';

function BuildRequest(overrides?: Partial<RepairRequest>): RepairRequest {
  return {
    id: 'request-1',
    customerId: 'customer-1',
    status: RequestStatus.Completed,
    acceptedOfferId: 'offer-1',
    ...overrides,
  } as RepairRequest;
}

function BuildOffer(overrides?: Partial<Offer>): Offer {
  return { id: 'offer-1', providerId: 'provider-1', ...overrides } as Offer;
}

function BuildProvider(overrides?: Partial<Provider>): Provider {
  return {
    id: 'provider-1',
    ownerUserId: 'provider-owner-1',
    businessName: 'Ana Repair',
    ...overrides,
  } as Provider;
}

function BuildUser(id: string, email: string, fullName: string): User {
  return { id, email, fullName, role: UserRole.ProviderOwner } as User;
}

describe('ReviewsService.Create', () => {
  function BuildService(overrides?: {
    request?: RepairRequest;
    existingReview?: boolean;
    ratings?: number[];
  }) {
    const request = overrides?.request ?? BuildRequest();

    const reviewsRepository = {
      ExistsForRequest: jest
        .fn()
        .mockResolvedValue(overrides?.existingReview ?? false),
      Create: jest
        .fn()
        .mockImplementation(
          (value) =>
            Promise.resolve({ id: 'review-1', ...value }) as Promise<Review>,
        ),
      ListRatingsForProvider: jest
        .fn()
        .mockResolvedValue(overrides?.ratings ?? [5]),
    } as unknown as ReviewsRepository;

    const repairRequestsService = {
      FindById: jest.fn().mockResolvedValue(request),
    } as unknown as RepairRequestsService;

    const offersService = {
      FindById: jest.fn().mockResolvedValue(BuildOffer()),
    } as unknown as OffersService;

    const providersService = {
      FindById: jest.fn().mockResolvedValue(BuildProvider()),
      UpdateRatingStats: jest.fn().mockResolvedValue(BuildProvider()),
    } as unknown as ProvidersService;

    const usersService = {
      FindById: jest
        .fn()
        .mockResolvedValue(
          BuildUser('provider-owner-1', 'owner@popravime.me', 'Provider Owner'),
        ),
    } as unknown as UsersService;

    const notificationsService = {
      Notify: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof ReviewsService>[6];

    const service = new ReviewsService(
      reviewsRepository,
      repairRequestsService,
      offersService,
      providersService,
      usersService,
      notificationsService,
      logger,
    );

    return {
      service,
      reviewsRepository,
      providersService,
      notificationsService,
    };
  }

  it('creates the review and recomputes provider rating stats', async () => {
    const {
      service,
      reviewsRepository,
      providersService,
      notificationsService,
    } = BuildService({
      ratings: [5, 4],
    });

    const review = await service.Create('customer-1', {
      requestId: 'request-1',
      rating: 4,
      comment: 'Great service, fixed it fast',
    });

    expect(review.id).toBe('review-1');
    expect(reviewsRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'provider-1',
        customerId: 'customer-1',
      }),
    );
    expect(providersService.UpdateRatingStats).toHaveBeenCalledWith(
      'provider-1',
      expect.objectContaining({ reviewCount: 2 }),
    );
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({
        email: expect.objectContaining({ kind: 'review-created' }),
      }),
    );
  });

  it('rejects when the caller does not own the repair request', async () => {
    const { service } = BuildService({
      request: BuildRequest({ customerId: 'someone-else' }),
    });

    await expect(
      service.Create('customer-1', {
        requestId: 'request-1',
        rating: 5,
        comment: 'Nice',
      }),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });

  it('rejects when the repair request is not completed', async () => {
    const { service } = BuildService({
      request: BuildRequest({ status: RequestStatus.InProgress }),
    });

    await expect(
      service.Create('customer-1', {
        requestId: 'request-1',
        rating: 5,
        comment: 'Nice',
      }),
    ).rejects.toBeInstanceOf(DomainConflictException);
  });

  it('rejects a second review for the same request', async () => {
    const { service } = BuildService({ existingReview: true });

    await expect(
      service.Create('customer-1', {
        requestId: 'request-1',
        rating: 5,
        comment: 'Nice',
      }),
    ).rejects.toBeInstanceOf(DomainConflictException);
  });

  it('rejects when the request has no accepted offer', async () => {
    const { service } = BuildService({
      request: BuildRequest({ acceptedOfferId: null }),
    });

    await expect(
      service.Create('customer-1', {
        requestId: 'request-1',
        rating: 5,
        comment: 'Nice',
      }),
    ).rejects.toBeInstanceOf(DomainConflictException);
  });
});
