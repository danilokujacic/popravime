import { OffersService } from './offers.service';
import { OffersRepository } from './offers.repository';
import { ProvidersService } from '../providers/providers.service';
import { RepairRequestsService } from '../repair-requests/repair-requests.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OfferStatus, PartsType } from './offers.types';
import { VerificationStatus } from '../providers/providers.types';
import { UserRole } from '../users/users.types';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { Offer } from './entities/offer.entity';
import { Provider } from '../providers/entities/provider.entity';
import { User } from '../users/entities/user.entity';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';
import { RequestStatus } from '../repair-requests/repair-requests.types';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

function BuildOffer(overrides?: Partial<Offer>): Offer {
  return {
    id: 'offer-1',
    requestId: 'request-1',
    providerId: 'provider-1',
    priceMin: '3000',
    priceMax: '6000',
    estimatedDuration: '2 days',
    partsType: PartsType.Original,
    message: null,
    status: OfferStatus.Pending,
    createdAt: new Date(),
    ...overrides,
  } as Offer;
}

function BuildProvider(overrides?: Partial<Provider>): Provider {
  return {
    id: 'provider-1',
    ownerUserId: 'provider-owner-1',
    businessName: 'Ana Repair',
    slug: 'ana-repair',
    verificationStatus: VerificationStatus.Pending,
    ...overrides,
  } as Provider;
}

function BuildUser(
  id: string,
  email: string,
  fullName: string,
  phone: string | null = null,
): User {
  return { id, email, fullName, phone, role: UserRole.Customer } as User;
}

describe('OffersService.Accept', () => {
  function BuildService(overrides?: {
    offer?: ReturnType<typeof BuildOffer>;
    otherPending?: ReturnType<typeof BuildOffer>[];
    acceptOfferMock?: jest.Mock;
  }) {
    const offer = overrides?.offer ?? BuildOffer();
    const otherPending = overrides?.otherPending ?? [];

    const offersRepository = {
      FindById: jest.fn().mockResolvedValue(offer),
      Save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
      SaveMany: jest
        .fn()
        .mockImplementation((values) => Promise.resolve(values)),
      FindOtherPending: jest.fn().mockResolvedValue(otherPending),
    } as unknown as OffersRepository;

    const providersService = {
      FindById: jest.fn().mockResolvedValue(BuildProvider()),
    } as unknown as ProvidersService;

    const repairRequestsService = {
      FindById: jest.fn(),
      AcceptOffer:
        overrides?.acceptOfferMock ??
        jest
          .fn()
          .mockResolvedValue({ id: 'request-1', customerId: 'customer-1' }),
    } as unknown as RepairRequestsService;

    const users = new Map<string, User>([
      [
        'provider-owner-1',
        BuildUser('provider-owner-1', 'owner@popravime.me', 'Provider Owner'),
      ],
      ['customer-1', BuildUser('customer-1', 'kupac@popravime.me', 'Kupac')],
    ]);
    const usersService = {
      FindById: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve(users.get(id))),
    } as unknown as UsersService;

    const notificationsService = {
      Notify: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const verification = {
      required: true,
    };

    const app = {
      frontendUrl: 'http://localhost:3000',
    } as unknown as ConstructorParameters<typeof OffersService>[6];

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof OffersService>[7];

    const service = new OffersService(
      offersRepository,
      providersService,
      repairRequestsService,
      usersService,
      notificationsService,
      verification,
      app,
      logger,
    );

    return {
      service,
      offersRepository,
      repairRequestsService,
      notificationsService,
      offer,
      logger,
    };
  }

  it('accepts the offer, updates the request, and auto-rejects every other pending offer', async () => {
    const otherPending = [
      BuildOffer({ id: 'offer-2' }),
      BuildOffer({ id: 'offer-3' }),
    ];
    const {
      service,
      offersRepository,
      repairRequestsService,
      notificationsService,
    } = BuildService({
      otherPending,
    });

    const result = await service.Accept('offer-1', 'customer-1');

    expect(result.status).toBe(OfferStatus.Accepted);
    expect(repairRequestsService.AcceptOffer).toHaveBeenCalledWith(
      'request-1',
      'offer-1',
      'customer-1',
    );
    expect(offersRepository.SaveMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'offer-2', status: OfferStatus.Rejected }),
      expect.objectContaining({ id: 'offer-3', status: OfferStatus.Rejected }),
    ]);
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'provider-owner-1',
        email: expect.objectContaining({
          kind: 'offer-accepted',
          payload: expect.objectContaining({
            to: 'owner@popravime.me',
            customerName: 'Kupac',
            customerEmail: 'kupac@popravime.me',
          }),
        }),
      }),
    );
  });

  it('emails the customer their provider’s contact info too, not just the provider', async () => {
    const { service, notificationsService } = BuildService();

    await service.Accept('offer-1', 'customer-1');

    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'customer-1',
        type: 'offer_accepted_confirmation',
        email: expect.objectContaining({
          kind: 'offer-accepted-customer',
          payload: expect.objectContaining({
            to: 'kupac@popravime.me',
            providerName: 'Ana Repair',
          }),
        }),
      }),
    );
  });

  it('does not touch other offers when there are none pending', async () => {
    const { service, offersRepository } = BuildService({ otherPending: [] });

    await service.Accept('offer-1', 'customer-1');

    expect(offersRepository.SaveMany).not.toHaveBeenCalled();
  });

  it('rejects accepting an offer that is not pending', async () => {
    const { service, repairRequestsService, logger } = BuildService({
      offer: BuildOffer({ status: OfferStatus.Withdrawn }),
    });

    await expect(
      service.Accept('offer-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsService.AcceptOffer).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ offerId: 'offer-1' }),
      expect.any(String),
    );
  });

  it('never mutates the offer when the request does not belong to the caller', async () => {
    const acceptOfferMock = jest
      .fn()
      .mockRejectedValue(
        new DomainForbiddenException('NOT_OWNED', 'not yours'),
      );
    const { service, offersRepository } = BuildService({ acceptOfferMock });

    await expect(
      service.Accept('offer-1', 'someone-else'),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(offersRepository.Save).not.toHaveBeenCalled();
  });
});

describe('OffersService.Reopen', () => {
  function BuildService(overrides?: {
    offer?: ReturnType<typeof BuildOffer>;
    request?: { id: string; acceptedOfferId: string | null };
    reopenMock?: jest.Mock;
  }) {
    const offer = overrides?.offer ?? BuildOffer({ status: OfferStatus.Accepted });
    const request = overrides?.request ?? {
      id: 'request-1',
      acceptedOfferId: 'offer-1',
    };

    const offersRepository = {
      FindById: jest.fn().mockResolvedValue(offer),
      Save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    } as unknown as OffersRepository;

    const providersService = {
      FindById: jest.fn().mockResolvedValue(BuildProvider()),
    } as unknown as ProvidersService;

    const repairRequestsService = {
      FindById: jest.fn().mockResolvedValue(request),
      Reopen:
        overrides?.reopenMock ??
        jest.fn().mockResolvedValue({ ...request, status: 'open' }),
    } as unknown as RepairRequestsService;

    const users = new Map<string, User>([
      [
        'provider-owner-1',
        BuildUser('provider-owner-1', 'owner@popravime.me', 'Provider Owner'),
      ],
    ]);
    const usersService = {
      FindById: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve(users.get(id))),
    } as unknown as UsersService;

    const notificationsService = {
      Notify: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const app = {
      frontendUrl: 'http://localhost:3000',
    } as unknown as ConstructorParameters<typeof OffersService>[6];

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof OffersService>[7];

    const service = new OffersService(
      offersRepository,
      providersService,
      repairRequestsService,
      usersService,
      notificationsService,
      { required: true },
      app,
      logger,
    );

    return {
      service,
      offersRepository,
      repairRequestsService,
      notificationsService,
      logger,
    };
  }

  it('reopens the request and cancels the previously accepted offer', async () => {
    const { service, offersRepository, repairRequestsService, notificationsService } =
      BuildService();

    const result = await service.Reopen('request-1', 'customer-1');

    expect(repairRequestsService.Reopen).toHaveBeenCalledWith(
      'request-1',
      'customer-1',
    );
    expect(offersRepository.Save).toHaveBeenCalledWith(
      expect.objectContaining({ status: OfferStatus.Cancelled }),
    );
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'provider-owner-1',
        type: 'offer_cancelled',
        email: expect.objectContaining({ kind: 'offer-cancelled' }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({ id: 'request-1', status: 'open' }),
    );
  });

  it('rejects reopening a request with no accepted offer', async () => {
    const { service, offersRepository, repairRequestsService } = BuildService({
      request: { id: 'request-1', acceptedOfferId: null },
    });

    await expect(
      service.Reopen('request-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsService.Reopen).not.toHaveBeenCalled();
    expect(offersRepository.Save).not.toHaveBeenCalled();
  });

  it('rejects reopening when the accepted offer is somehow not in an accepted state', async () => {
    const { service, repairRequestsService } = BuildService({
      offer: BuildOffer({ status: OfferStatus.Withdrawn }),
    });

    await expect(
      service.Reopen('request-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsService.Reopen).not.toHaveBeenCalled();
  });
});

function BuildRequest(overrides?: Partial<RepairRequest>): RepairRequest {
  return {
    id: 'request-1',
    customerId: 'customer-1',
    status: RequestStatus.Open,
    ...overrides,
  } as RepairRequest;
}

describe('OffersService.Create', () => {
  function BuildService(
    request: RepairRequest,
    provider: ReturnType<typeof BuildProvider> = BuildProvider({
      verificationStatus: VerificationStatus.Verified,
    }),
    verificationRequired = true,
  ) {
    const offersRepository = {
      Create: jest
        .fn()
        .mockImplementation((value) =>
          Promise.resolve({ id: 'offer-1', ...value }),
        ),
    } as unknown as OffersRepository;

    const providersService = {
      FindById: jest.fn().mockResolvedValue(provider),
    } as unknown as ProvidersService;

    const repairRequestsService = {
      FindById: jest.fn().mockResolvedValue(request),
      MarkOffersReceived: jest.fn().mockResolvedValue(undefined),
    } as unknown as RepairRequestsService;

    const usersService = {
      FindById: jest
        .fn()
        .mockResolvedValue(
          BuildUser('customer-1', 'kupac@popravime.me', 'Kupac'),
        ),
    } as unknown as UsersService;

    const notificationsService = {
      Notify: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const verification = {
      required: verificationRequired,
    };

    const app = {
      frontendUrl: 'http://localhost:3000',
    } as unknown as ConstructorParameters<typeof OffersService>[6];

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof OffersService>[7];

    const service = new OffersService(
      offersRepository,
      providersService,
      repairRequestsService,
      usersService,
      notificationsService,
      verification,
      app,
      logger,
    );

    return {
      service,
      repairRequestsService,
      notificationsService,
      offersRepository,
      logger,
    };
  }

  it('creates the offer and marks the request as offers_received', async () => {
    const { service, repairRequestsService, notificationsService } =
      BuildService(BuildRequest());

    await service.Create('provider-owner-1', {
      requestId: 'request-1',
      providerId: 'provider-1',
      priceMin: '3000',
      priceMax: '6000',
      estimatedDuration: '2 days',
      partsType: PartsType.Original,
    });

    expect(repairRequestsService.MarkOffersReceived).toHaveBeenCalledWith(
      'request-1',
    );
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({
        email: expect.objectContaining({ kind: 'offer-received' }),
      }),
    );
  });

  it('rejects submitting an offer once the request is no longer open for offers', async () => {
    const { service, logger } = BuildService(
      BuildRequest({ status: RequestStatus.Accepted }),
    );

    await expect(
      service.Create('provider-owner-1', {
        requestId: 'request-1',
        providerId: 'provider-1',
        priceMin: '3000',
        priceMax: '6000',
        estimatedDuration: '2 days',
        partsType: PartsType.Original,
      }),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'request-1' }),
      expect.any(String),
    );
  });

  it('rejects submitting an offer for a provider the caller does not own', async () => {
    const { service, offersRepository, logger } = BuildService(
      BuildRequest(),
      BuildProvider({
        ownerUserId: 'someone-else',
        verificationStatus: VerificationStatus.Verified,
      }),
    );

    await expect(
      service.Create('provider-owner-1', {
        requestId: 'request-1',
        providerId: 'provider-1',
        priceMin: '3000',
        priceMax: '6000',
        estimatedDuration: '2 days',
        partsType: PartsType.Original,
      }),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(offersRepository.Create).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOwnerId: 'someone-else',
        requesterId: 'provider-owner-1',
      }),
      expect.any(String),
    );
  });

  it('rejects submitting an offer for a pending provider when verification is required', async () => {
    const { service, offersRepository } = BuildService(
      BuildRequest(),
      BuildProvider({ verificationStatus: VerificationStatus.Pending }),
      true,
    );

    await expect(
      service.Create('provider-owner-1', {
        requestId: 'request-1',
        providerId: 'provider-1',
        priceMin: '3000',
        priceMax: '6000',
        estimatedDuration: '2 days',
        partsType: PartsType.Original,
      }),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(offersRepository.Create).not.toHaveBeenCalled();
  });

  it('creates the offer for a pending provider when verification is not required', async () => {
    const { service, offersRepository } = BuildService(
      BuildRequest(),
      BuildProvider({ verificationStatus: VerificationStatus.Pending }),
      false,
    );

    await service.Create('provider-owner-1', {
      requestId: 'request-1',
      providerId: 'provider-1',
      priceMin: '3000',
      priceMax: '6000',
      estimatedDuration: '2 days',
      partsType: PartsType.Original,
    });

    expect(offersRepository.Create).toHaveBeenCalled();
  });

  it('rejects submitting an offer for a rejected provider regardless of the verification-required setting', async () => {
    for (const verificationRequired of [true, false]) {
      const { service, offersRepository } = BuildService(
        BuildRequest(),
        BuildProvider({ verificationStatus: VerificationStatus.Rejected }),
        verificationRequired,
      );

      await expect(
        service.Create('provider-owner-1', {
          requestId: 'request-1',
          providerId: 'provider-1',
          priceMin: '3000',
          priceMax: '6000',
          estimatedDuration: '2 days',
          partsType: PartsType.Original,
        }),
      ).rejects.toBeInstanceOf(DomainForbiddenException);
      expect(offersRepository.Create).not.toHaveBeenCalled();
    }
  });
});

describe('OffersService.Reject', () => {
  function BuildService(overrides?: {
    offer?: ReturnType<typeof BuildOffer>;
    request?: RepairRequest;
  }) {
    const offer = overrides?.offer ?? BuildOffer();
    const request = overrides?.request ?? BuildRequest();

    const offersRepository = {
      FindById: jest.fn().mockResolvedValue(offer),
      Save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    } as unknown as OffersRepository;

    const repairRequestsService = {
      FindById: jest.fn().mockResolvedValue(request),
    } as unknown as RepairRequestsService;

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof OffersService>[7];

    const service = new OffersService(
      offersRepository,
      {} as ProvidersService,
      repairRequestsService,
      {} as UsersService,
      {} as NotificationsService,
      { required: true },
      {} as ConstructorParameters<typeof OffersService>[6],
      logger,
    );

    return { service, offersRepository, logger };
  }

  it('rejects the offer for its owning customer', async () => {
    const { service, offersRepository } = BuildService();

    const result = await service.Reject('offer-1', 'customer-1');

    expect(result.status).toBe(OfferStatus.Rejected);
    expect(offersRepository.Save).toHaveBeenCalled();
  });

  it('rejects a caller who does not own the repair request', async () => {
    const { service, offersRepository, logger } = BuildService({
      request: BuildRequest({ customerId: 'someone-else' }),
    });

    await expect(
      service.Reject('offer-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(offersRepository.Save).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ offerId: 'offer-1', customerId: 'customer-1' }),
      expect.any(String),
    );
  });

  it('rejects rejecting an offer that is not pending', async () => {
    const { service, logger } = BuildService({
      offer: BuildOffer({ status: OfferStatus.Withdrawn }),
    });

    await expect(
      service.Reject('offer-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ offerId: 'offer-1' }),
      expect.any(String),
    );
  });
});

describe('OffersService.Withdraw', () => {
  function BuildService(overrides?: {
    offer?: ReturnType<typeof BuildOffer>;
    provider?: Provider;
  }) {
    const offer = overrides?.offer ?? BuildOffer();
    const provider = overrides?.provider ?? BuildProvider();

    const offersRepository = {
      FindById: jest.fn().mockResolvedValue(offer),
      Save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    } as unknown as OffersRepository;

    const providersService = {
      FindById: jest.fn().mockResolvedValue(provider),
    } as unknown as ProvidersService;

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof OffersService>[7];

    const service = new OffersService(
      offersRepository,
      providersService,
      {} as RepairRequestsService,
      {} as UsersService,
      {} as NotificationsService,
      { required: true },
      {} as ConstructorParameters<typeof OffersService>[6],
      logger,
    );

    return { service, offersRepository, logger };
  }

  it('withdraws the offer for its owning provider', async () => {
    const { service, offersRepository } = BuildService();

    const result = await service.Withdraw('offer-1', 'provider-owner-1');

    expect(result.status).toBe(OfferStatus.Withdrawn);
    expect(offersRepository.Save).toHaveBeenCalled();
  });

  it('rejects a caller who does not own the provider', async () => {
    const { service, offersRepository, logger } = BuildService({
      provider: BuildProvider({ ownerUserId: 'someone-else' }),
    });

    await expect(
      service.Withdraw('offer-1', 'provider-owner-1'),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(offersRepository.Save).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOwnerId: 'someone-else',
        requesterId: 'provider-owner-1',
      }),
      expect.any(String),
    );
  });
});

function BuildViewer(
  overrides?: Partial<AuthenticatedUser>,
): AuthenticatedUser {
  return {
    id: 'viewer-1',
    email: 'viewer@popravime.me',
    role: UserRole.Admin,
    ...overrides,
  };
}

describe('OffersService viewer scoping', () => {
  function BuildService(overrides?: {
    offer?: Offer;
    request?: RepairRequest;
    viewerProvider?: Provider;
  }) {
    const offer = overrides?.offer ?? BuildOffer({ providerId: 'provider-1' });
    const request =
      overrides?.request ?? BuildRequest({ customerId: 'customer-1' });
    const viewerProvider =
      overrides?.viewerProvider ?? BuildProvider({ id: 'provider-1' });

    const offersRepository = {
      FindById: jest.fn().mockResolvedValue(offer),
      List: jest
        .fn()
        .mockResolvedValue({ items: [offer], total: 1, page: 1, limit: 10 }),
    } as unknown as OffersRepository;

    const providersService = {
      GetForUser: jest.fn().mockResolvedValue(viewerProvider),
    } as unknown as ProvidersService;

    const repairRequestsService = {
      FindById: jest.fn().mockResolvedValue(request),
    } as unknown as RepairRequestsService;

    const usersService = {
      FindById: jest
        .fn()
        .mockResolvedValue(
          BuildUser(
            'customer-1',
            'kupac@popravime.me',
            'Kupac',
            '+38267000000',
          ),
        ),
    } as unknown as UsersService;

    const notificationsService = {} as unknown as NotificationsService;
    const verification = { required: true };
    const app = {
      frontendUrl: 'http://localhost:3000',
    } as unknown as ConstructorParameters<typeof OffersService>[6];
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof OffersService>[7];

    const service = new OffersService(
      offersRepository,
      providersService,
      repairRequestsService,
      usersService,
      notificationsService,
      verification,
      app,
      logger,
    );

    return { service, offersRepository, providersService, offer, request };
  }

  describe('ListForViewer', () => {
    it('passes the filter through unchanged for an admin', async () => {
      const { service, offersRepository } = BuildService();

      await service.ListForViewer(
        { requestId: 'request-1' },
        BuildViewer(),
        1,
        10,
      );

      expect(offersRepository.List).toHaveBeenCalledWith(
        { requestId: 'request-1' },
        1,
        10,
      );
    });

    it("forces providerId to the viewer's own provider, ignoring any other providerId requested", async () => {
      const { service, offersRepository } = BuildService({
        viewerProvider: BuildProvider({ id: 'my-provider' }),
      });

      await service.ListForViewer(
        { providerId: 'someone-elses-provider' },
        BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
        1,
        10,
      );

      expect(offersRepository.List).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'my-provider' }),
        1,
        10,
      );
    });

    it('rejects a customer listing offers without a request_id', async () => {
      const { service } = BuildService();

      await expect(
        service.ListForViewer(
          {},
          BuildViewer({ id: 'customer-1', role: UserRole.Customer }),
          1,
          10,
        ),
      ).rejects.toBeInstanceOf(DomainForbiddenException);
    });

    it("rejects a customer listing offers for a request they don't own", async () => {
      const { service } = BuildService({
        request: BuildRequest({ customerId: 'someone-else' }),
      });

      await expect(
        service.ListForViewer(
          { requestId: 'request-1' },
          BuildViewer({ id: 'customer-1', role: UserRole.Customer }),
          1,
          10,
        ),
      ).rejects.toBeInstanceOf(DomainForbiddenException);
    });

    it('lets a customer list offers for their own request', async () => {
      const { service, offersRepository } = BuildService({
        request: BuildRequest({ customerId: 'customer-1' }),
      });

      await service.ListForViewer(
        { requestId: 'request-1' },
        BuildViewer({ id: 'customer-1', role: UserRole.Customer }),
        1,
        10,
      );

      expect(offersRepository.List).toHaveBeenCalledWith(
        { requestId: 'request-1' },
        1,
        10,
      );
    });
  });

  describe('FindByIdForViewer', () => {
    it("rejects a provider viewing an offer they don't own", async () => {
      const { service } = BuildService({
        offer: BuildOffer({ providerId: 'someone-elses-provider' }),
        viewerProvider: BuildProvider({ id: 'my-provider' }),
      });

      await expect(
        service.FindByIdForViewer(
          'offer-1',
          BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
        ),
      ).rejects.toBeInstanceOf(DomainForbiddenException);
    });

    it('lets a provider view their own offer', async () => {
      const { service } = BuildService({
        offer: BuildOffer({ providerId: 'my-provider' }),
        viewerProvider: BuildProvider({ id: 'my-provider' }),
      });

      const result = await service.FindByIdForViewer(
        'offer-1',
        BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
      );

      expect(result.id).toBe('offer-1');
    });

    it("rejects a customer viewing an offer on a request they don't own", async () => {
      const { service } = BuildService({
        request: BuildRequest({ customerId: 'someone-else' }),
      });

      await expect(
        service.FindByIdForViewer(
          'offer-1',
          BuildViewer({ id: 'customer-1', role: UserRole.Customer }),
        ),
      ).rejects.toBeInstanceOf(DomainForbiddenException);
    });
  });

  describe('ResolveCustomerContactForOffer', () => {
    it('returns null for a pending offer regardless of viewer', async () => {
      const { service, offer } = BuildService({
        offer: BuildOffer({ status: OfferStatus.Pending }),
      });

      const result = await service.ResolveCustomerContactForOffer(
        offer,
        BuildViewer(),
      );

      expect(result).toBeNull();
    });

    it('returns null for a customer viewing their own accepted offer', async () => {
      const { service, offer } = BuildService({
        offer: BuildOffer({ status: OfferStatus.Accepted }),
      });

      const result = await service.ResolveCustomerContactForOffer(
        offer,
        BuildViewer({ id: 'customer-1', role: UserRole.Customer }),
      );

      expect(result).toBeNull();
    });

    it("returns the customer's contact for the provider once accepted", async () => {
      const { service, offer } = BuildService({
        offer: BuildOffer({ status: OfferStatus.Accepted }),
      });

      const result = await service.ResolveCustomerContactForOffer(
        offer,
        BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
      );

      expect(result).toEqual({
        fullName: 'Kupac',
        email: 'kupac@popravime.me',
        phone: '+38267000000',
      });
    });

    it('returns the customer contact for an admin too', async () => {
      const { service, offer } = BuildService({
        offer: BuildOffer({ status: OfferStatus.Accepted }),
      });

      const result = await service.ResolveCustomerContactForOffer(
        offer,
        BuildViewer(),
      );

      expect(result?.email).toBe('kupac@popravime.me');
    });
  });

  describe('ResolveProviderContactForOffer', () => {
    const acceptedOfferWithContact = () =>
      BuildOffer({
        status: OfferStatus.Accepted,
        provider: BuildProvider({
          phone: '+38267111111',
          email: 'ana@repair.me',
        }),
      });

    it('returns null for a pending offer regardless of viewer', async () => {
      const { service, offer } = BuildService({
        offer: BuildOffer({
          status: OfferStatus.Pending,
          provider: BuildProvider({
            phone: '+38267111111',
            email: 'ana@repair.me',
          }),
        }),
      });

      const result = await service.ResolveProviderContactForOffer(
        offer,
        BuildViewer(),
      );

      expect(result).toBeNull();
    });

    it('returns null for the provider viewing their own accepted offer', async () => {
      const { service, offer } = BuildService({
        offer: acceptedOfferWithContact(),
      });

      const result = await service.ResolveProviderContactForOffer(
        offer,
        BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
      );

      expect(result).toBeNull();
    });

    it("returns the provider's contact for the customer once accepted", async () => {
      const { service, offer } = BuildService({
        offer: acceptedOfferWithContact(),
      });

      const result = await service.ResolveProviderContactForOffer(
        offer,
        BuildViewer({ id: 'customer-1', role: UserRole.Customer }),
      );

      expect(result).toEqual({
        phone: '+38267111111',
        email: 'ana@repair.me',
      });
    });

    it('returns the provider contact for an admin too', async () => {
      const { service, offer } = BuildService({
        offer: acceptedOfferWithContact(),
      });

      const result = await service.ResolveProviderContactForOffer(
        offer,
        BuildViewer(),
      );

      expect(result?.email).toBe('ana@repair.me');
    });
  });
});
