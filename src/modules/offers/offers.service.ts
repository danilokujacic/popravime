import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from 'typeorm-transactional';
import { OffersRepository } from './offers.repository';
import { Offer } from './entities/offer.entity';
import { OfferStatus } from './offers.types';
import type { CreateOfferInput, ListOffersFilter } from './offers.types';
import {
  IsProviderEligible,
  VerificationStatus,
} from '../providers/providers.types';
import { verificationConfig } from '../../config/verification.config';
import { appConfig } from '../../config/app.config';
import { RequestStatus } from '../repair-requests/repair-requests.types';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';
import { Provider } from '../providers/entities/provider.entity';
import { IOffersService } from './offers.service.interface';
import { OfferStatusTransitions } from './state/offer-status.transitions';
import { ProvidersService } from '../providers/providers.service';
import { RepairRequestsService } from '../repair-requests/repair-requests.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import { UserRole } from '../users/users.types';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { CustomerContactDto } from './dto/customer-contact.dto';
import { ProviderContactDto } from './dto/provider-contact.dto';
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
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
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
    this.EnsureProviderEligible(provider);

    const request = await this.repairRequestsService.FindById(input.requestId);
    this.EnsureAcceptingOffers(input.requestId, request.status);

    const offer = await this.offersRepository.Create({
      requestId: input.requestId,
      providerId: input.providerId,
      priceMin: input.priceMin,
      priceMax: input.priceMax,
      estimatedDuration: input.estimatedDuration,
      partsType: input.partsType,
      message: input.message ?? null,
    });
    // Already fetched and validated above — avoids a redundant round trip to hydrate the
    // relation the response mapper needs.
    offer.provider = provider;

    await this.repairRequestsService.MarkOffersReceived(input.requestId);

    const customer = await this.usersService.FindById(request.customerId);
    await this.notificationsService.Notify({
      userId: customer.id,
      type: NotificationType.NewOffer,
      messageKey: 'new_offer',
      messageParams: { providerName: provider.businessName },
      relatedEntityType: 'offer',
      relatedEntityId: offer.id,
      email: {
        kind: 'offer-received',
        payload: {
          to: customer.email,
          locale: customer.locale,
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
    this.EnsureTransition(offerId, offer.status, OfferStatus.Accepted);

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
    const customer = await this.usersService.FindById(customerId);

    // Contact info matters more than the in-app chat here — both sides get it straight in the
    // acceptance email, not just unlocked behind a login + conversation thread.
    await this.notificationsService.Notify({
      userId: providerOwner.id,
      type: NotificationType.OfferAccepted,
      messageKey: 'offer_accepted',
      relatedEntityType: 'offer',
      relatedEntityId: offer.id,
      email: {
        kind: 'offer-accepted',
        payload: {
          to: providerOwner.email,
          locale: providerOwner.locale,
          providerName: provider.businessName,
          requestId: offer.requestId,
          customerName: customer.fullName,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          previewUrl: `${this.app.frontendUrl}/provider/requests/${offer.requestId}`,
        },
      },
    });

    await this.notificationsService.Notify({
      userId: customer.id,
      type: NotificationType.OfferAcceptedConfirmation,
      messageKey: 'offer_accepted_confirmation',
      messageParams: { providerName: provider.businessName },
      relatedEntityType: 'offer',
      relatedEntityId: offer.id,
      email: {
        kind: 'offer-accepted-customer',
        payload: {
          to: customer.email,
          locale: customer.locale,
          customerName: customer.fullName,
          providerName: provider.businessName,
          providerEmail: provider.email,
          providerPhone: provider.phone,
          providerWebsite: provider.website,
          previewUrl: `${this.app.frontendUrl}/dashboard/requests/${offer.requestId}`,
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

    savedOffer.provider = provider;
    return savedOffer;
  }

  async Reject(offerId: string, customerId: string): Promise<Offer> {
    const offer = await this.FindById(offerId);
    this.EnsureTransition(offerId, offer.status, OfferStatus.Rejected);

    const request = await this.repairRequestsService.FindById(offer.requestId);
    if (request.customerId !== customerId) {
      this.logger.warn(
        { offerId, customerId },
        'Offer rejection rejected: not the owning customer',
      );
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
    this.EnsureTransition(offerId, offer.status, OfferStatus.Withdrawn);

    const provider = await this.providersService.FindById(offer.providerId);
    this.EnsureProviderOwnership(provider.ownerUserId, providerOwnerId);

    offer.status = OfferStatus.Withdrawn;
    const saved = await this.offersRepository.Save(offer);

    this.logger.info({ offerId, providerOwnerId }, 'Offer withdrawn');

    return saved;
  }

  // Orchestrates both halves of "customer stops working with an already-accepted provider":
  // RepairRequestsService.Reopen() flips the request back to Open (bounded by the per-request
  // reopen limit), then this cancels the offer that used to be accepted
  // and lets its provider know. One transaction, so a crash mid-way can't leave the request
  // reopened while its old offer still reads Accepted, or vice versa.
  @Transactional()
  async Reopen(requestId: string, customerId: string): Promise<RepairRequest> {
    const requestBefore = await this.repairRequestsService.FindById(requestId);
    const offerId = requestBefore.acceptedOfferId;
    if (!offerId) {
      this.logger.warn(
        { requestId, customerId },
        'Reopen rejected: request has no accepted offer to cancel',
      );
      throw new DomainConflictException(
        'REPAIR_REQUEST_NOT_ACCEPTED',
        'This repair request has no accepted offer to reopen from',
      );
    }

    const offer = await this.FindById(offerId);
    this.EnsureTransition(offerId, offer.status, OfferStatus.Cancelled);

    const reopened = await this.repairRequestsService.Reopen(
      requestId,
      customerId,
    );

    offer.status = OfferStatus.Cancelled;
    await this.offersRepository.Save(offer);

    const provider = await this.providersService.FindById(offer.providerId);
    const providerOwner = await this.usersService.FindById(
      provider.ownerUserId,
    );
    await this.notificationsService.Notify({
      userId: providerOwner.id,
      type: NotificationType.OfferCancelled,
      messageKey: 'offer_cancelled',
      relatedEntityType: 'offer',
      relatedEntityId: offer.id,
      email: {
        kind: 'offer-cancelled',
        payload: {
          to: providerOwner.email,
          locale: providerOwner.locale,
          providerName: provider.businessName,
          requestId,
        },
      },
    });

    this.logger.info(
      { requestId, offerId, customerId },
      'Offer cancelled, request reopened',
    );

    return reopened;
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

  // §7.3-adjacent: unlike FindById/List above (used internally by other services that already
  // enforce their own authorization), these two are what the controller calls directly — every
  // offer a provider can reach through them is guaranteed to be their own, which is what lets
  // ResolveCustomerContactForOffer below skip a second ownership check.
  async ListForViewer(
    filter: ListOffersFilter,
    viewer: AuthenticatedUser,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Offer>> {
    const scoped = await this.ScopeFilterToViewer(filter, viewer);
    return this.offersRepository.List(scoped, page, limit);
  }

  async FindByIdForViewer(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<Offer> {
    const offer = await this.FindById(id);
    await this.EnsureOfferViewable(offer, viewer);
    return offer;
  }

  // Only an offer's own provider owner (or an admin) ever gets the customer's contact details,
  // and only once it's actually Accepted — a pending/rejected/withdrawn offer never carries this,
  // and a customer viewing their own offers never needs it (it's their own information).
  async ResolveCustomerContactForOffer(
    offer: Offer,
    viewer: AuthenticatedUser,
  ): Promise<CustomerContactDto | null> {
    if (offer.status !== OfferStatus.Accepted) return null;
    if (viewer.role === UserRole.Customer) return null;

    const request = await this.repairRequestsService.FindById(offer.requestId);
    const customer = await this.usersService.FindById(request.customerId);
    return {
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
    };
  }

  // Mirrors ResolveCustomerContactForOffer: only once the offer is actually Accepted, and only
  // for the viewer entitled to it (the customer who owns the request, or an admin) — a provider
  // owner viewing their own offers never needs this back, and any other status keeps it private.
  async ResolveProviderContactForOffer(
    offer: Offer,
    viewer: AuthenticatedUser,
  ): Promise<ProviderContactDto | null> {
    if (offer.status !== OfferStatus.Accepted) return null;
    if (viewer.role === UserRole.ProviderOwner) return null;

    return {
      phone: offer.provider.phone,
      email: offer.provider.email,
    };
  }

  private async ScopeFilterToViewer(
    filter: ListOffersFilter,
    viewer: AuthenticatedUser,
  ): Promise<ListOffersFilter> {
    if (viewer.role === UserRole.Admin) {
      return filter;
    }
    if (viewer.role === UserRole.ProviderOwner) {
      const provider = await this.providersService.GetForUser(viewer.id);
      return { ...filter, providerId: provider.id };
    }
    if (!filter.requestId) {
      throw new DomainForbiddenException(
        'OFFERS_REQUEST_ID_REQUIRED',
        'A request_id is required to list your offers',
      );
    }
    const request = await this.repairRequestsService.FindById(filter.requestId);
    if (request.customerId !== viewer.id) {
      throw new DomainForbiddenException(
        'REPAIR_REQUEST_NOT_OWNED',
        'You do not own this repair request',
      );
    }
    return filter;
  }

  private async EnsureOfferViewable(
    offer: Offer,
    viewer: AuthenticatedUser,
  ): Promise<void> {
    if (viewer.role === UserRole.Admin) {
      return;
    }
    if (viewer.role === UserRole.ProviderOwner) {
      const provider = await this.providersService.GetForUser(viewer.id);
      if (offer.providerId !== provider.id) {
        throw new DomainForbiddenException(
          'OFFER_NOT_OWNED',
          'You do not own this offer',
        );
      }
      return;
    }
    const request = await this.repairRequestsService.FindById(offer.requestId);
    if (request.customerId !== viewer.id) {
      throw new DomainForbiddenException(
        'OFFER_NOT_OWNED',
        'You do not own this offer',
      );
    }
  }

  private EnsureAcceptingOffers(
    requestId: string,
    status: RequestStatus,
  ): void {
    const acceptsOffers =
      status === RequestStatus.Open || status === RequestStatus.OffersReceived;
    if (!acceptsOffers) {
      this.logger.warn(
        { requestId, status },
        'Offer submission rejected: request no longer accepting offers',
      );
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
      this.logger.warn(
        { providerOwnerId, requesterId },
        'Offer operation rejected: not the owning provider',
      );
      throw new DomainForbiddenException(
        'PROVIDER_NOT_OWNED',
        'You do not own this provider profile',
      );
    }
  }

  private EnsureProviderEligible(provider: Provider): void {
    if (!IsProviderEligible(provider, this.verification.required)) {
      this.logger.warn(
        {
          verificationStatus: provider.verificationStatus,
          approved: provider.approved,
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

  private EnsureTransition(
    offerId: string,
    from: OfferStatus,
    to: OfferStatus,
  ): void {
    if (!OfferStatusTransitions.CanTransition(from, to)) {
      this.logger.warn(
        { offerId, from, to },
        'Offer operation rejected: invalid status transition',
      );
      throw new DomainConflictException(
        'INVALID_OFFER_TRANSITION',
        `Cannot transition offer from ${from} to ${to}`,
      );
    }
  }
}
