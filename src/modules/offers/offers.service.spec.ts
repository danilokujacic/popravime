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

function BuildUser(id: string, email: string, fullName: string): User {
  return { id, email, fullName, role: UserRole.Customer } as User;
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
    } as unknown as ConstructorParameters<typeof OffersService>[5];

    const service = new OffersService(
      offersRepository,
      providersService,
      repairRequestsService,
      usersService,
      notificationsService,
      logger,
    );

    return {
      service,
      offersRepository,
      repairRequestsService,
      notificationsService,
      offer,
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
        email: expect.objectContaining({ kind: 'offer-accepted' }),
      }),
    );
  });

  it('does not touch other offers when there are none pending', async () => {
    const { service, offersRepository } = BuildService({ otherPending: [] });

    await service.Accept('offer-1', 'customer-1');

    expect(offersRepository.SaveMany).not.toHaveBeenCalled();
  });

  it('rejects accepting an offer that is not pending', async () => {
    const { service, repairRequestsService } = BuildService({
      offer: BuildOffer({ status: OfferStatus.Withdrawn }),
    });

    await expect(
      service.Accept('offer-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsService.AcceptOffer).not.toHaveBeenCalled();
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

function BuildRequest(overrides?: Partial<RepairRequest>): RepairRequest {
  return {
    id: 'request-1',
    customerId: 'customer-1',
    status: RequestStatus.Open,
    ...overrides,
  } as RepairRequest;
}

describe('OffersService.Create', () => {
  function BuildService(request: RepairRequest) {
    const offersRepository = {
      Create: jest
        .fn()
        .mockImplementation((value) =>
          Promise.resolve({ id: 'offer-1', ...value }),
        ),
    } as unknown as OffersRepository;

    const providersService = {
      FindById: jest.fn().mockResolvedValue(BuildProvider()),
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

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof OffersService>[5];

    const service = new OffersService(
      offersRepository,
      providersService,
      repairRequestsService,
      usersService,
      notificationsService,
      logger,
    );

    return { service, repairRequestsService, notificationsService };
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
    const { service } = BuildService(
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
  });
});
