import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from 'typeorm-transactional';
import { OffersRepository } from './offers.repository';
import { Offer } from './entities/offer.entity';
import { OfferStatus } from './offers.types';
import type { CreateOfferInput, ListOffersFilter } from './offers.types';
import {
  IsEligibleVerificationStatus,
  VerificationStatus,
} from '../providers/providers.types';
import { verificationConfig } from '../../config/verification.config';
import { RequestStatus } from '../repair-requests/repair-requests.types';
import { IOffersService } from './offers.service.interface';
import { OfferStatusTransitions } from './state/offer-status.transitions';
import { ProvidersService } from '../providers/providers.service';
import { RepairRequestsService } from '../repair-requests/repair-requests.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';

@Injectable()
export class OffersService implements IOffersService {
  constructor(
    private readonly offersRepository: OffersRepository,
    private readonly providersService: ProvidersService,
    private readonly repairRequestsService: RepairRequestsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @Inject(verificationConfig.KEY)
    private readonly verification: ConfigType<typeof verificationConfig>,
    @InjectPinoLogger(OffersService.name)
    private readonly logger: PinoLogger,
  ) {}

  @Transactional()
  async Create(
    providerOwnerId: string,
    input: CreateOfferInput,
  ): Promise<Offer> {
    const provider = await this.providersService.FindById(input.providerId);
    this.EnsureProviderOwnership(provider.ownerUserId, providerOwnerId);
    this.EnsureProviderEligible(provider.verificationStatus);

    const request = await this.repairRequestsService.FindById(input.requestId);
    this.EnsureAcceptingOffers(request.status);

    const offer = await this.offersRepository.Create({
      requestId: input.requestId,
      providerId: input.providerId,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      estimatedDuration: input.estimatedDuration,
      partsType: input.partsType,
      message: input.message ?? null,
    });

    await this.repairRequestsService.MarkOffersReceived(input.requestId);

    const customer = await this.usersService.FindById(request.customerId);
    await this.notificationsService.Notify({
      userId: customer.id,
      type: NotificationType.NewOffer,
      title: 'New offer received',
      body: `${provider.businessName} sent an offer for your repair request`,
      relatedEntityType: 'offer',
      relatedEntityId: offer.id,
      email: {
        kind: 'offer-received',
        payload: {
          to: customer.email,
          customerName: customer.fullName,
          providerName: provider.businessName,
          requestId: request.id,
        },
      },
    });

    this.logger.info(
      {
        offerId: offer.id,
        requestId: input.requestId,
        providerId: input.providerId,
        verificationRequired: this.verification.required,
      },
      'Offer submitted',
    );

    return offer;
  }

  @Transactional()
  async Accept(offerId: string, customerId: string): Promise<Offer> {
    const offer = await this.FindById(offerId);
    this.EnsureTransition(offer.status, OfferStatus.Accepted);

    await this.repairRequestsService.AcceptOffer(
      offer.requestId,
      offer.id,
      customerId,
    );

    offer.status = OfferStatus.Accepted;
    const savedOffer = await this.offersRepository.Save(offer);

    const otherPending = await this.offersRepository.FindOtherPending(
      offer.requestId,
      offer.id,
    );
    if (otherPending.length > 0) {
      const rejected = otherPending.map((pending) => {
        pending.status = OfferStatus.Rejected;
        return pending;
      });
      await this.offersRepository.SaveMany(rejected);
    }

    const provider = await this.providersService.FindById(offer.providerId);
    const providerOwner = await this.usersService.FindById(
      provider.ownerUserId,
    );
    await this.notificationsService.Notify({
      userId: providerOwner.id,
      type: NotificationType.OfferAccepted,
      title: 'Offer accepted',
      body: `Your offer for repair request ${offer.requestId} was accepted`,
      relatedEntityType: 'offer',
      relatedEntityId: offer.id,
      email: {
        kind: 'offer-accepted',
        payload: {
          to: providerOwner.email,
          providerName: provider.businessName,
          requestId: offer.requestId,
        },
      },
    });

    this.logger.info(
      {
        offerId,
        requestId: offer.requestId,
        customerId,
        autoRejectedCount: otherPending.length,
      },
      'Offer accepted',
    );

    return savedOffer;
  }

  async Reject(offerId: string, customerId: string): Promise<Offer> {
    const offer = await this.FindById(offerId);
    this.EnsureTransition(offer.status, OfferStatus.Rejected);

    const request = await this.repairRequestsService.FindById(offer.requestId);
    if (request.customerId !== customerId) {
      throw new DomainForbiddenException(
        'OFFER_NOT_OWNED',
        'You do not own the repair request this offer belongs to',
      );
    }

    offer.status = OfferStatus.Rejected;
    const saved = await this.offersRepository.Save(offer);

    this.logger.info({ offerId, customerId }, 'Offer rejected');

    return saved;
  }

  async Withdraw(offerId: string, providerOwnerId: string): Promise<Offer> {
    const offer = await this.FindById(offerId);
    this.EnsureTransition(offer.status, OfferStatus.Withdrawn);

    const provider = await this.providersService.FindById(offer.providerId);
    this.EnsureProviderOwnership(provider.ownerUserId, providerOwnerId);

    offer.status = OfferStatus.Withdrawn;
    const saved = await this.offersRepository.Save(offer);

    this.logger.info({ offerId, providerOwnerId }, 'Offer withdrawn');

    return saved;
  }

  async FindById(id: string): Promise<Offer> {
    const offer = await this.offersRepository.FindById(id);
    if (!offer) {
      throw new DomainNotFoundException('OFFER_NOT_FOUND', 'Offer not found');
    }
    return offer;
  }

  List(
    filter: ListOffersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Offer>> {
    return this.offersRepository.List(filter, page, limit);
  }

  private EnsureAcceptingOffers(status: RequestStatus): void {
    const acceptsOffers =
      status === RequestStatus.Open || status === RequestStatus.OffersReceived;
    if (!acceptsOffers) {
      throw new DomainConflictException(
        'REQUEST_NOT_ACCEPTING_OFFERS',
        'This repair request is no longer accepting offers',
      );
    }
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

  private EnsureProviderEligible(
    verificationStatus: VerificationStatus,
  ): void {
    if (
      !IsEligibleVerificationStatus(
        verificationStatus,
        this.verification.required,
      )
    ) {
      this.logger.warn(
        {
          verificationStatus,
          verificationRequired: this.verification.required,
        },
        'Offer rejected: provider not eligible',
      );
      throw new DomainForbiddenException(
        'PROVIDER_NOT_VERIFIED',
        'Your provider profile must be verified before submitting offers',
      );
    }
  }

  private EnsureTransition(from: OfferStatus, to: OfferStatus): void {
    if (!OfferStatusTransitions.CanTransition(from, to)) {
      throw new DomainConflictException(
        'INVALID_OFFER_TRANSITION',
        `Cannot transition offer from ${from} to ${to}`,
      );
    }
  }
}
