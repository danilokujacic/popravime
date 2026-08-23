import { RepairRequestsService } from './repair-requests.service';
import { RepairRequestsRepository } from './repair-requests.repository';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RepairRequest } from './entities/repair-request.entity';
import { RequestStatus, Urgency } from './repair-requests.types';
import { UserRole } from '../users/users.types';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
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

describe('RepairRequestsService.FindByIdForViewer', () => {
  function BuildService(request: RepairRequest) {
    const repairRequestsRepository = {
      FindById: jest.fn().mockResolvedValue(request),
    } as unknown as RepairRequestsRepository;

    const storageService = {} as StorageService;
    const usersService = {} as UsersService;
    const notificationsService = {} as NotificationsService;

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof RepairRequestsService>[4];

    return new RepairRequestsService(
      repairRequestsRepository,
      storageService,
      usersService,
      notificationsService,
      logger,
    );
  }

  it('lets a customer view their own request', async () => {
    const request = BuildRequest();
    const service = BuildService(request);

    const result = await service.FindByIdForViewer(
      'request-1',
      BuildViewer({ id: 'customer-1' }),
    );

    expect(result.id).toBe('request-1');
  });

  it("rejects a customer viewing someone else's request", async () => {
    const request = BuildRequest({ customerId: 'customer-1' });
    const service = BuildService(request);

    await expect(
      service.FindByIdForViewer('request-1', BuildViewer({ id: 'customer-2' })),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });

  it('lets a provider owner view any request', async () => {
    const request = BuildRequest({ customerId: 'customer-1' });
    const service = BuildService(request);

    const result = await service.FindByIdForViewer(
      'request-1',
      BuildViewer({ id: 'provider-owner-1', role: UserRole.ProviderOwner }),
    );

    expect(result.id).toBe('request-1');
  });

  it('lets an admin view any request', async () => {
    const request = BuildRequest({ customerId: 'customer-1' });
    const service = BuildService(request);

    const result = await service.FindByIdForViewer(
      'request-1',
      BuildViewer({ id: 'admin-1', role: UserRole.Admin }),
    );

    expect(result.id).toBe('request-1');
  });
});
