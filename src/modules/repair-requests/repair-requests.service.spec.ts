import { RepairRequestsService } from './repair-requests.service';
import { RepairRequestsRepository } from './repair-requests.repository';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProvidersService } from '../providers/providers.service';
import { CategoriesService } from '../categories/categories.service';
import { CitiesService } from '../cities/cities.service';
import { RepairRequest } from './entities/repair-request.entity';
import { RequestStatus, Urgency } from './repair-requests.types';
import { UserRole } from '../users/users.types';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import type { StorageService } from '../infra/storage/storage.service.interface';

function BuildRequest(overrides?: Partial<RepairRequest>): RepairRequest {
  return {
    id: 'request-1',
    customerId: 'customer-1',
    status: RequestStatus.Open,
    urgency: Urgency.Standard,
    ...overrides,
  } as RepairRequest;
}

function BuildViewer(
  overrides?: Partial<AuthenticatedUser>,
): AuthenticatedUser {
  return {
    id: 'customer-1',
    email: 'customer@popravime.me',
    role: UserRole.Customer,
    ...overrides,
  };
}

function BuildService(request: RepairRequest) {
  const repairRequestsRepository = {
    FindById: jest.fn().mockResolvedValue(request),
    Create: jest.fn().mockResolvedValue(request),
    Save: jest.fn().mockImplementation((entity: RepairRequest) => entity),
    TryAccept: jest.fn().mockResolvedValue(true),
    TryReopen: jest.fn().mockResolvedValue(true),
  } as unknown as RepairRequestsRepository;

  const storageService = {
    UploadPrivate: jest.fn().mockResolvedValue({
      key: 'k.jpg',
      reference: 'private:k.jpg',
    }),
  } as unknown as StorageService;
  const usersService = {
    FindById: jest.fn().mockResolvedValue({
      id: 'customer-1',
      email: 'customer@popravime.me',
      fullName: 'A Customer',
    }),
  } as unknown as UsersService;
  const notificationsService = {
    Notify: jest.fn(),
  } as unknown as NotificationsService;
  const auditLogsService = { Log: jest.fn() } as unknown as AuditLogsService;
  const providersService = {
    ListEligibleForCategory: jest.fn().mockResolvedValue([]),
  } as unknown as ProvidersService;
  const categoriesService = {
    FindById: jest
      .fn()
      .mockResolvedValue({ id: 'category-1', name: 'Mobile phones' }),
  } as unknown as CategoriesService;
  const citiesService = {
    FindById: jest.fn().mockResolvedValue({ id: 'city-1', name: 'Podgorica' }),
  } as unknown as CitiesService;
  const app = {
    frontendUrl: 'http://localhost:3000',
  } as unknown as ConstructorParameters<typeof RepairRequestsService>[8];

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as ConstructorParameters<typeof RepairRequestsService>[9];

  const service = new RepairRequestsService(
    repairRequestsRepository,
    storageService,
    usersService,
    notificationsService,
    auditLogsService,
    providersService,
    categoriesService,
    citiesService,
    app,
    logger,
  );

  return {
    service,
    repairRequestsRepository,
    notificationsService,
    auditLogsService,
    providersService,
    logger,
  };
}

describe('RepairRequestsService.FindByIdForViewer', () => {
  it('lets a customer view their own request', async () => {
    const request = BuildRequest();
    const { service } = BuildService(request);

    const result = await service.FindByIdForViewer(
      'request-1',
      BuildViewer({ id: 'customer-1' }),
    );

    expect(result.id).toBe('request-1');
  });

  it("rejects a customer viewing someone else's request", async () => {
    const request = BuildRequest({ customerId: 'customer-1' });
    const { service } = BuildService(request);

    await expect(
      service.FindByIdForViewer('request-1', BuildViewer({ id: 'customer-2' })),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });

  it('lets a provider owner view an approved request', async () => {
    const request = BuildRequest({ customerId: 'customer-1' });
    const { service } = BuildService(request);

    const result = await service.FindByIdForViewer(
      'request-1',
      BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
    );

    expect(result.id).toBe('request-1');
  });

  it('rejects a provider owner viewing a request still pending moderation', async () => {
    const request = BuildRequest({
      customerId: 'customer-1',
      status: RequestStatus.PendingReview,
    });
    const { service } = BuildService(request);

    await expect(
      service.FindByIdForViewer(
        'request-1',
        BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
      ),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });

  it('lets an admin view any request regardless of moderation status', async () => {
    const request = BuildRequest({
      customerId: 'customer-1',
      status: RequestStatus.PendingReview,
    });
    const { service } = BuildService(request);

    const result = await service.FindByIdForViewer(
      'request-1',
      BuildViewer({ id: 'admin-1', role: UserRole.Admin }),
    );

    expect(result.id).toBe('request-1');
  });

  it('lets a provider owner view a request inside their serviced categories', async () => {
    const request = BuildRequest({
      customerId: 'customer-1',
      categoryId: 'category-plumbing',
    });
    const { service } = BuildService(request);

    const result = await service.FindByIdForViewer(
      'request-1',
      BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
      ['category-plumbing', 'category-electrics'],
    );

    expect(result.id).toBe('request-1');
  });

  it('rejects a provider owner viewing a request outside their serviced categories', async () => {
    const request = BuildRequest({
      customerId: 'customer-1',
      categoryId: 'category-electronics',
    });
    const { service } = BuildService(request);

    await expect(
      service.FindByIdForViewer(
        'request-1',
        BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
        ['category-plumbing'],
      ),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });

  it('rejects a provider owner with no verified provider (no serviced categories)', async () => {
    const request = BuildRequest({
      customerId: 'customer-1',
      categoryId: 'category-plumbing',
    });
    const { service } = BuildService(request);

    await expect(
      service.FindByIdForViewer(
        'request-1',
        BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
        [],
      ),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });
});

describe('RepairRequestsService.Create', () => {
  it('creates the request for the given customer', async () => {
    const { service, repairRequestsRepository } = BuildService(BuildRequest());

    await service.Create({
      customerId: 'customer-1',
      categoryId: 'category-1',
      description: 'The screen is cracked and unresponsive',
      cityId: 'city-1',
      urgency: Urgency.Standard,
    });

    expect(repairRequestsRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1' }),
    );
  });

  it('stores photos privately and keeps only their private references', async () => {
    const { service, repairRequestsRepository } = BuildService(BuildRequest());

    await service.Create({
      customerId: 'customer-1',
      categoryId: 'category-1',
      description: 'The screen is cracked and unresponsive',
      cityId: 'city-1',
      urgency: Urgency.Standard,
      photos: [
        {
          buffer: Buffer.from('x'),
          fileName: 'a.jpg',
          contentType: 'image/jpeg',
        },
      ],
    });

    expect(repairRequestsRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({ photoUrls: ['private:k.jpg'] }),
    );
  });
});

describe('RepairRequestsService.Approve / Reject', () => {
  it('moves a pending request to open and audit-logs the decision', async () => {
    const request = BuildRequest({ status: RequestStatus.PendingReview });
    const { service, auditLogsService } = BuildService(request);

    const result = await service.Approve('request-1', 'admin-1');

    expect(result.status).toBe(RequestStatus.Open);
    expect(auditLogsService.Log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'repair_request.open',
      }),
    );
  });

  it('moves a pending request to rejected', async () => {
    const request = BuildRequest({ status: RequestStatus.PendingReview });
    const { service } = BuildService(request);

    const result = await service.Reject(
      'request-1',
      'admin-1',
      'duplicate report',
    );

    expect(result.status).toBe(RequestStatus.Rejected);
  });

  it('rejects reviewing a request that already left pending_review', async () => {
    const request = BuildRequest({ status: RequestStatus.Open });
    const { service, logger } = BuildService(request);

    await expect(
      service.Approve('request-1', 'admin-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'request-1' }),
      expect.any(String),
    );
  });

  it('notifies the customer of the moderation decision', async () => {
    const request = BuildRequest({ status: RequestStatus.PendingReview });
    const { service, notificationsService } = BuildService(request);

    await service.Approve('request-1', 'admin-1');

    expect(notificationsService.Notify).toHaveBeenCalled();
  });

  it('notifies each eligible provider in the category once approved', async () => {
    const request = BuildRequest({
      status: RequestStatus.PendingReview,
      categoryId: 'category-1',
      cityId: 'city-1',
    });
    const { service, notificationsService, providersService } =
      BuildService(request);
    (providersService.ListEligibleForCategory as jest.Mock).mockResolvedValue([
      {
        ownerUserId: 'owner-1',
        businessName: 'Servis A',
        ownerUser: {
          id: 'owner-1',
          email: 'a@example.com',
          fullName: 'Owner A',
        },
      },
      {
        ownerUserId: 'owner-2',
        businessName: 'Servis B',
        ownerUser: {
          id: 'owner-2',
          email: 'b@example.com',
          fullName: 'Owner B',
        },
      },
    ]);

    await service.Approve('request-1', 'admin-1');

    expect(providersService.ListEligibleForCategory).toHaveBeenCalledWith(
      'category-1',
    );
    // One call for the customer's own status-change notification, plus one per eligible provider.
    expect(notificationsService.Notify).toHaveBeenCalledTimes(3);
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        type: 'new_repair_request',
        email: expect.objectContaining({
          kind: 'new-repair-request',
          payload: expect.objectContaining({
            to: 'a@example.com',
            previewUrl: 'http://localhost:3000/provider/requests/request-1',
          }),
        }),
      }),
    );
  });

  it('does not notify providers when a request is rejected', async () => {
    const request = BuildRequest({ status: RequestStatus.PendingReview });
    const { service, notificationsService, providersService } =
      BuildService(request);

    await service.Reject('request-1', 'admin-1');

    expect(providersService.ListEligibleForCategory).not.toHaveBeenCalled();
    expect(notificationsService.Notify).toHaveBeenCalledTimes(1);
  });
});

describe('RepairRequestsService.UpdateStatus', () => {
  it('rejects a direct transition to accepted regardless of current status', async () => {
    const request = BuildRequest({ status: RequestStatus.OffersReceived });
    const { service, repairRequestsRepository } = BuildService(request);

    await expect(
      service.UpdateStatus('request-1', 'customer-1', RequestStatus.Accepted),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsRepository.Save).not.toHaveBeenCalled();
  });

  it('rejects a direct transition to open (reopening needs the dedicated endpoint)', async () => {
    const request = BuildRequest({ status: RequestStatus.Accepted });
    const { service, repairRequestsRepository } = BuildService(request);

    await expect(
      service.UpdateStatus('request-1', 'customer-1', RequestStatus.Open),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsRepository.Save).not.toHaveBeenCalled();
  });

  it('allows a legitimate direct transition like cancelling', async () => {
    const request = BuildRequest({ status: RequestStatus.Open });
    const { service } = BuildService(request);

    const result = await service.UpdateStatus(
      'request-1',
      'customer-1',
      RequestStatus.Cancelled,
    );

    expect(result.status).toBe(RequestStatus.Cancelled);
  });
});

describe('RepairRequestsService.AcceptOffer', () => {
  it('accepts the offer via an atomic conditional transition', async () => {
    const request = BuildRequest({ status: RequestStatus.OffersReceived });
    const { service, repairRequestsRepository } = BuildService(request);

    const result = await service.AcceptOffer(
      'request-1',
      'offer-1',
      'customer-1',
    );

    expect(result.status).toBe(RequestStatus.Accepted);
    expect(result.acceptedOfferId).toBe('offer-1');
    expect(repairRequestsRepository.TryAccept).toHaveBeenCalledWith(
      'request-1',
      'offer-1',
      [RequestStatus.OffersReceived],
    );
    expect(repairRequestsRepository.Save).not.toHaveBeenCalled();
  });

  it('throws a conflict without saving when another offer won the race', async () => {
    const request = BuildRequest({ status: RequestStatus.OffersReceived });
    const { service, repairRequestsRepository } = BuildService(request);
    (repairRequestsRepository.TryAccept as jest.Mock).mockResolvedValue(false);

    await expect(
      service.AcceptOffer('request-1', 'offer-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsRepository.Save).not.toHaveBeenCalled();
  });

  it('rejects a customer who does not own the request before touching the database', async () => {
    const request = BuildRequest({
      customerId: 'someone-else',
      status: RequestStatus.OffersReceived,
    });
    const { service, repairRequestsRepository, logger } = BuildService(request);

    await expect(
      service.AcceptOffer('request-1', 'offer-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(repairRequestsRepository.TryAccept).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-1',
        customerId: 'customer-1',
      }),
      expect.any(String),
    );
  });
});

describe('RepairRequestsService.Reopen', () => {
  it('reopens an accepted request via an atomic conditional transition', async () => {
    const request = BuildRequest({
      status: RequestStatus.Accepted,
      acceptedOfferId: 'offer-1',
    });
    const { service, repairRequestsRepository, notificationsService } =
      BuildService(request);

    const result = await service.Reopen('request-1', 'customer-1');

    expect(result.status).toBe(RequestStatus.Open);
    expect(result.acceptedOfferId).toBeNull();
    expect(repairRequestsRepository.TryReopen).toHaveBeenCalledWith(
      'request-1',
      [RequestStatus.Accepted, RequestStatus.InProgress],
    );
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'request_reopened' }),
    );
  });

  it('reopens an in-progress request too', async () => {
    const request = BuildRequest({
      status: RequestStatus.InProgress,
      acceptedOfferId: 'offer-1',
    });
    const { service } = BuildService(request);

    const result = await service.Reopen('request-1', 'customer-1');

    expect(result.status).toBe(RequestStatus.Open);
  });

  it('re-notifies eligible providers on reopen, same as a fresh moderation approval', async () => {
    const request = BuildRequest({
      status: RequestStatus.Accepted,
      acceptedOfferId: 'offer-1',
      categoryId: 'category-1',
      cityId: 'city-1',
    });
    const { service, notificationsService, providersService } =
      BuildService(request);
    (providersService.ListEligibleForCategory as jest.Mock).mockResolvedValue([
      {
        ownerUserId: 'owner-1',
        businessName: 'Servis A',
        ownerUser: { id: 'owner-1', email: 'a@example.com', fullName: 'A' },
      },
    ]);

    await service.Reopen('request-1', 'customer-1');

    // One call for the customer's reopen confirmation, one for the eligible provider.
    expect(notificationsService.Notify).toHaveBeenCalledTimes(2);
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        type: 'new_repair_request',
      }),
    );
  });

  it('rejects reopening a request with no accepted offer', async () => {
    const request = BuildRequest({
      status: RequestStatus.Accepted,
      acceptedOfferId: null,
    });
    const { service, repairRequestsRepository } = BuildService(request);

    await expect(
      service.Reopen('request-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsRepository.TryReopen).not.toHaveBeenCalled();
  });

  it('throws a conflict without notifying when reopen loses the race', async () => {
    const request = BuildRequest({
      status: RequestStatus.Accepted,
      acceptedOfferId: 'offer-1',
    });
    const { service, repairRequestsRepository, notificationsService } =
      BuildService(request);
    (repairRequestsRepository.TryReopen as jest.Mock).mockResolvedValue(false);

    await expect(
      service.Reopen('request-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(notificationsService.Notify).not.toHaveBeenCalled();
  });

  it('rejects a customer who does not own the request', async () => {
    const request = BuildRequest({
      customerId: 'someone-else',
      status: RequestStatus.Accepted,
      acceptedOfferId: 'offer-1',
    });
    const { service, repairRequestsRepository } = BuildService(request);

    await expect(
      service.Reopen('request-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(repairRequestsRepository.TryReopen).not.toHaveBeenCalled();
  });

  it('rejects reopening a request that is not accepted or in progress', async () => {
    const request = BuildRequest({
      status: RequestStatus.Completed,
      acceptedOfferId: 'offer-1',
    });
    const { service, repairRequestsRepository } = BuildService(request);

    await expect(
      service.Reopen('request-1', 'customer-1'),
    ).rejects.toBeInstanceOf(DomainConflictException);
    expect(repairRequestsRepository.TryReopen).not.toHaveBeenCalled();
  });
});
