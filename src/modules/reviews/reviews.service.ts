import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ReviewsRepository } from './reviews.repository';
import { Review } from './entities/review.entity';
import { CreateReviewInput, OverallReviewStats } from './reviews.types';
import { IReviewsService } from './reviews.service.interface';
import { ProviderRatingCalculator } from './calculators/provider-rating.calculator';
import { RepairRequestsService } from '../repair-requests/repair-requests.service';
import { RequestStatus } from '../repair-requests/repair-requests.types';
import { OffersService } from '../offers/offers.service';
import { ProvidersService } from '../providers/providers.service';
import { Provider } from '../providers/entities/provider.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';

@Injectable()
export class ReviewsService implements IReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly repairRequestsService: RepairRequestsService,
    private readonly offersService: OffersService,
    private readonly providersService: ProvidersService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @InjectPinoLogger(ReviewsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Create(customerId: string, input: CreateReviewInput): Promise<Review> {
    const request = await this.repairRequestsService.FindById(input.requestId);
    this.EnsureRequestOwnership(request.customerId, customerId);
    this.EnsureCompleted(request.status);
    await this.EnsureNoExistingReview(request.id);
    const acceptedOfferId = this.EnsureHasAcceptedOffer(
      request.acceptedOfferId,
    );

    const offer = await this.offersService.FindById(acceptedOfferId);

    const review = await this.reviewsRepository.Create({
      requestId: request.id,
      customerId,
      providerId: offer.providerId,
      rating: input.rating,
      comment: input.comment,
    });

    const provider = await this.RecomputeRatingStats(offer.providerId);

    const providerOwner = await this.usersService.FindById(
      provider.ownerUserId,
    );
    await this.notificationsService.Notify({
      userId: providerOwner.id,
      type: NotificationType.NewReview,
      title: 'New review received',
      body: `You received a ${input.rating}-star review`,
      relatedEntityType: 'review',
      relatedEntityId: review.id,
      email: {
        kind: 'review-created',
        payload: {
          to: providerOwner.email,
          providerName: provider.businessName,
          rating: input.rating,
          requestId: request.id,
        },
      },
    });

    this.logger.info(
      { reviewId: review.id, providerId: offer.providerId, customerId },
      'Review created',
    );

    return review;
  }

  async RespondTo(
    reviewId: string,
    providerOwnerId: string,
    response: string,
  ): Promise<Review> {
    const review = await this.FindById(reviewId);
    const provider = await this.providersService.FindById(review.providerId);
    this.EnsureProviderOwnership(provider.ownerUserId, providerOwnerId);
    this.EnsureNoExistingResponse(review.providerResponse);

    review.providerResponse = response;
    const saved = await this.reviewsRepository.Save(review);

    this.logger.info({ reviewId, providerOwnerId }, 'Review response added');

    return saved;
  }

  async FindById(id: string): Promise<Review> {
    const review = await this.reviewsRepository.FindById(id);
    if (!review) {
      throw new DomainNotFoundException('REVIEW_NOT_FOUND', 'Review not found');
    }
    return review;
  }

  ListForProvider(
    providerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Review>> {
    return this.reviewsRepository.ListPublishedForProvider(
      providerId,
      page,
      limit,
    );
  }

  OverallStats(): Promise<OverallReviewStats> {
    return this.reviewsRepository.OverallStats();
  }

  private async RecomputeRatingStats(providerId: string): Promise<Provider> {
    const ratings =
      await this.reviewsRepository.ListRatingsForProvider(providerId);
    const stats = ProviderRatingCalculator.Compute(ratings);
    return this.providersService.UpdateRatingStats(providerId, stats);
  }

  private EnsureRequestOwnership(
    requestCustomerId: string,
    customerId: string,
  ): void {
    if (requestCustomerId !== customerId) {
      throw new DomainForbiddenException(
        'REPAIR_REQUEST_NOT_OWNED',
        'You do not own this repair request',
      );
    }
  }

  private EnsureCompleted(status: RequestStatus): void {
    if (status !== RequestStatus.Completed) {
      throw new DomainConflictException(
        'REQUEST_NOT_COMPLETED',
        'You can only review a completed repair request',
      );
    }
  }

  private async EnsureNoExistingReview(requestId: string): Promise<void> {
    const exists = await this.reviewsRepository.ExistsForRequest(requestId);
    if (exists) {
      throw new DomainConflictException(
        'REVIEW_ALREADY_EXISTS',
        'This repair request already has a review',
      );
    }
  }

  private EnsureHasAcceptedOffer(acceptedOfferId: string | null): string {
    if (!acceptedOfferId) {
      throw new DomainConflictException(
        'NO_ACCEPTED_OFFER',
        'This repair request has no accepted offer to review',
      );
    }
    return acceptedOfferId;
  }

  private EnsureProviderOwnership(
    providerOwnerId: string,
    requesterId: string,
  ): void {
    if (providerOwnerId !== requesterId) {
      throw new DomainForbiddenException(
        'PROVIDER_NOT_OWNED',
        'You do not own this provider profile',
      );
    }
  }

  private EnsureNoExistingResponse(providerResponse: string | null): void {
    if (providerResponse !== null) {
      throw new DomainConflictException(
        'REVIEW_ALREADY_RESPONDED',
        'This review already has a provider response',
      );
    }
  }
}
