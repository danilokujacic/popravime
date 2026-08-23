import { MessagesService } from './messages.service';
import { MessagesRepository } from './messages.repository';
import { RepairRequestsService } from '../repair-requests/repair-requests.service';
import { OffersService } from '../offers/offers.service';
import { DirectInquiriesService } from '../direct-inquiries/direct-inquiries.service';
import { ProvidersService } from '../providers/providers.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { StorageService } from '../infra/storage/storage.service.interface';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';
import { DirectInquiry } from '../direct-inquiries/entities/direct-inquiry.entity';
import { Provider } from '../providers/entities/provider.entity';
import { User } from '../users/entities/user.entity';
import { Message } from './entities/message.entity';
import { UserRole } from '../users/users.types';
import { InquiryStatus } from '../direct-inquiries/direct-inquiries.types';
import { DomainValidationException } from '../../common/exceptions/validation.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';

function BuildUser(id: string): User {
  return {
    id,
    email: `${id}@popravime.me`,
    fullName: id,
    role: UserRole.Customer,
  } as User;
}

function BuildProvider(): Provider {
  return { id: 'provider-1', ownerUserId: 'provider-owner-1' } as Provider;
}

function BuildRequest(overrides?: Partial<RepairRequest>): RepairRequest {
  return {
    id: 'request-1',
    customerId: 'customer-1',
    acceptedOfferId: 'offer-1',
    ...overrides,
  } as RepairRequest;
}

function BuildInquiry(overrides?: Partial<DirectInquiry>): DirectInquiry {
  return {
    id: 'inquiry-1',
    providerId: 'provider-1',
    customerId: 'customer-1',
    status: InquiryStatus.New,
    ...overrides,
  } as DirectInquiry;
}

describe('MessagesService.Create', () => {
  function BuildService(overrides?: {
    request?: RepairRequest;
    inquiry?: DirectInquiry;
  }) {
    const messagesRepository = {
      Create: jest
        .fn()
        .mockImplementation(
          (value) =>
            Promise.resolve({ id: 'message-1', ...value }) as Promise<Message>,
        ),
    } as unknown as MessagesRepository;

    const repairRequestsService = {
      FindById: jest
        .fn()
        .mockResolvedValue(overrides?.request ?? BuildRequest()),
    } as unknown as RepairRequestsService;

    const offersService = {
      FindById: jest.fn().mockResolvedValue({
        id: 'offer-1',
        providerId: 'provider-1',
      }),
    } as unknown as OffersService;

    const directInquiriesService = {
      Get: jest.fn().mockResolvedValue(overrides?.inquiry ?? BuildInquiry()),
    } as unknown as DirectInquiriesService;

    const providersService = {
      FindById: jest.fn().mockResolvedValue(BuildProvider()),
    } as unknown as ProvidersService;

    const usersService = {
      FindById: jest
        .fn()
        .mockImplementation((id: string) => Promise.resolve(BuildUser(id))),
    } as unknown as UsersService;

    const notificationsService = {
      Notify: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationsService;

    const storageService = {
      Upload: jest.fn(),
      Delete: jest.fn(),
      GetUrl: jest.fn(),
    } as unknown as StorageService;

    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
    } as unknown as ConstructorParameters<typeof MessagesService>[8];

    const service = new MessagesService(
      messagesRepository,
      repairRequestsService,
      offersService,
      directInquiriesService,
      providersService,
      usersService,
      notificationsService,
      storageService,
      logger,
    );

    return { service, messagesRepository, notificationsService };
  }

  it('rejects when both request_id and inquiry_id are provided', async () => {
    const { service } = BuildService();

    await expect(
      service.Create('customer-1', {
        requestId: 'request-1',
        inquiryId: 'inquiry-1',
        body: 'hi',
      }),
    ).rejects.toBeInstanceOf(DomainValidationException);
  });

  it('rejects when neither request_id nor inquiry_id are provided', async () => {
    const { service } = BuildService();

    await expect(
      service.Create('customer-1', { body: 'hi' }),
    ).rejects.toBeInstanceOf(DomainValidationException);
  });

  it('allows the request customer to message the accepted provider owner', async () => {
    const { service, messagesRepository, notificationsService } =
      BuildService();

    const message = await service.Create('customer-1', {
      requestId: 'request-1',
      body: 'hi',
    });

    expect(message.id).toBe('message-1');
    expect(messagesRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'request-1',
        senderId: 'customer-1',
      }),
    );
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'provider-owner-1' }),
    );
  });

  it('rejects a sender who is not a participant of the request conversation', async () => {
    const { service } = BuildService();

    await expect(
      service.Create('someone-else', { requestId: 'request-1', body: 'hi' }),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });

  it('allows the inquiry sender to message the provider owner', async () => {
    const { service, notificationsService } = BuildService();

    await service.Create('customer-1', { inquiryId: 'inquiry-1', body: 'hi' });

    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'provider-owner-1' }),
    );
  });

  it('rejects a sender who is not a participant of the inquiry conversation', async () => {
    const { service } = BuildService();

    await expect(
      service.Create('someone-else', { inquiryId: 'inquiry-1', body: 'hi' }),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
  });
});
