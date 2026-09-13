import { DirectInquiriesService } from './direct-inquiries.service';
import { DirectInquiriesRepository } from './direct-inquiries.repository';
import { ProvidersService } from '../providers/providers.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DirectInquiry } from './entities/direct-inquiry.entity';
import { InquiryStatus } from './direct-inquiries.types';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainValidationException } from '../../common/exceptions/validation.exception';

function BuildInquiry(overrides?: Partial<DirectInquiry>): DirectInquiry {
  return {
    id: 'inquiry-1',
    customerId: 'customer-1',
    providerId: 'provider-1',
    name: null,
    contactEmail: null,
    contactPhone: null,
    message: 'Can you fix my phone?',
    status: InquiryStatus.New,
    createdAt: new Date(),
    ...overrides,
  } as DirectInquiry;
}

function BuildService(inquiry: DirectInquiry) {
  const directInquiriesRepository = {
    Create: jest.fn().mockResolvedValue(inquiry),
    FindById: jest.fn().mockResolvedValue(inquiry),
    Save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
  } as unknown as DirectInquiriesRepository;

  const providersService = {
    FindById: jest.fn().mockResolvedValue({
      id: 'provider-1',
      ownerUserId: 'owner-1',
      businessName: 'Servis A',
    }),
  } as unknown as ProvidersService;

  const usersService = {
    FindById: jest.fn().mockResolvedValue({
      id: 'owner-1',
      email: 'owner@popravime.me',
      fullName: 'Owner A',
    }),
  } as unknown as UsersService;

  const notificationsService = {
    Notify: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as ConstructorParameters<typeof DirectInquiriesService>[4];

  const service = new DirectInquiriesService(
    directInquiriesRepository,
    providersService,
    usersService,
    notificationsService,
    logger,
  );

  return {
    service,
    directInquiriesRepository,
    providersService,
    usersService,
    notificationsService,
    logger,
  };
}

describe('DirectInquiriesService.Create', () => {
  it('creates the inquiry, notifies the provider owner, and logs who sent it', async () => {
    const inquiry = BuildInquiry();
    const { service, notificationsService, logger } = BuildService(inquiry);

    const result = await service.Create({
      providerId: 'provider-1',
      customerId: 'customer-1',
      message: 'Can you fix my phone?',
    });

    expect(result.id).toBe('inquiry-1');
    expect(notificationsService.Notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner-1',
        type: 'new_inquiry',
        email: expect.objectContaining({ kind: 'new-inquiry' }),
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        inquiryId: 'inquiry-1',
        providerId: 'provider-1',
        customerId: 'customer-1',
      }),
      'Direct inquiry created',
    );
  });

  it('rejects a guest submission with no contact info before touching the database', async () => {
    const inquiry = BuildInquiry();
    const { service, directInquiriesRepository, logger } =
      BuildService(inquiry);

    await expect(
      service.Create({
        providerId: 'provider-1',
        message: 'Can you fix my phone?',
      }),
    ).rejects.toBeInstanceOf(DomainValidationException);
    expect(directInquiriesRepository.Create).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'provider-1' }),
      expect.any(String),
    );
  });
});

describe('DirectInquiriesService.UpdateStatus', () => {
  it('rejects a caller who does not own the inquiry provider', async () => {
    const inquiry = BuildInquiry();
    const { service, providersService, logger } = BuildService(inquiry);
    (providersService.FindById as jest.Mock).mockResolvedValue({
      id: 'provider-1',
      ownerUserId: 'someone-else',
    });

    await expect(
      service.UpdateStatus('inquiry-1', 'owner-1', InquiryStatus.Contacted),
    ).rejects.toBeInstanceOf(DomainForbiddenException);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'provider-1',
        providerOwnerId: 'owner-1',
      }),
      expect.any(String),
    );
  });
});
