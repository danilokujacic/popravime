import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from 'typeorm-transactional';
import { DirectInquiriesRepository } from './direct-inquiries.repository';
import { DirectInquiry } from './entities/direct-inquiry.entity';
import { InquiryStatus } from './direct-inquiries.types';
import type {
  CreateDirectInquiryInput,
  ListDirectInquiriesFilter,
} from './direct-inquiries.types';
import { IDirectInquiriesService } from './direct-inquiries.service.interface';
import { ProvidersService } from '../providers/providers.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainValidationException } from '../../common/exceptions/validation.exception';
import { legalConfig } from '../../config/legal.config';

@Injectable()
export class DirectInquiriesService implements IDirectInquiriesService {
  constructor(
    private readonly directInquiriesRepository: DirectInquiriesRepository,
    private readonly providersService: ProvidersService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @Inject(legalConfig.KEY)
    private readonly legal: ConfigType<typeof legalConfig>,
    @InjectPinoLogger(DirectInquiriesService.name)
    private readonly logger: PinoLogger,
  ) {}

  @Transactional()
  async Create(input: CreateDirectInquiryInput): Promise<DirectInquiry> {
    if (!input.customerId) {
      this.EnsureGuestContactInfo(input);
    }

    const provider = await this.providersService.FindById(input.providerId);

    const inquiry = await this.directInquiriesRepository.Create({
      customerId: input.customerId ?? null,
      providerId: input.providerId,
      name: input.name ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      message: input.message,
      termsAcceptedAt: new Date(),
      termsVersion: this.legal.termsVersion,
    });

    const senderName = await this.ResolveSenderName(input);
    const providerOwner = await this.usersService.FindById(
      provider.ownerUserId,
    );
    await this.notificationsService.Notify({
      userId: providerOwner.id,
      type: NotificationType.NewInquiry,
      messageKey: 'new_inquiry',
      messageParams: { senderName },
      relatedEntityType: 'direct_inquiry',
      relatedEntityId: inquiry.id,
      email: {
        kind: 'new-inquiry',
        payload: {
          to: providerOwner.email,
          locale: providerOwner.locale,
          providerName: provider.businessName,
          senderName,
        },
      },
    });

    this.logger.info(
      {
        inquiryId: inquiry.id,
        providerId: input.providerId,
        customerId: input.customerId ?? null,
      },
      'Direct inquiry created',
    );

    return inquiry;
  }

  async FindById(id: string, providerOwnerId: string): Promise<DirectInquiry> {
    const inquiry = await this.GetOrThrow(id);
    await this.EnsureOwnsProvider(inquiry.providerId, providerOwnerId);
    return inquiry;
  }

  Get(id: string): Promise<DirectInquiry> {
    return this.GetOrThrow(id);
  }

  async List(
    filter: ListDirectInquiriesFilter,
    providerOwnerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<DirectInquiry>> {
    await this.EnsureOwnsProvider(filter.providerId, providerOwnerId);
    return this.directInquiriesRepository.List(filter, page, limit);
  }

  async UpdateStatus(
    id: string,
    providerOwnerId: string,
    status: InquiryStatus,
  ): Promise<DirectInquiry> {
    const inquiry = await this.GetOrThrow(id);
    await this.EnsureOwnsProvider(inquiry.providerId, providerOwnerId);

    inquiry.status = status;
    const saved = await this.directInquiriesRepository.Save(inquiry);

    this.logger.info(
      { inquiryId: id, providerOwnerId, status },
      'Inquiry status changed',
    );

    return saved;
  }

  private async ResolveSenderName(
    input: CreateDirectInquiryInput,
  ): Promise<string> {
    if (input.name) {
      return input.name;
    }
    if (input.customerId) {
      const customer = await this.usersService.FindById(input.customerId);
      return customer.fullName;
    }
    return 'A customer';
  }

  private async GetOrThrow(id: string): Promise<DirectInquiry> {
    const inquiry = await this.directInquiriesRepository.FindById(id);
    if (!inquiry) {
      throw new DomainNotFoundException(
        'DIRECT_INQUIRY_NOT_FOUND',
        'Direct inquiry not found',
      );
    }
    return inquiry;
  }

  private async EnsureOwnsProvider(
    providerId: string,
    providerOwnerId: string,
  ): Promise<void> {
    const provider = await this.providersService.FindById(providerId);
    if (provider.ownerUserId !== providerOwnerId) {
      this.logger.warn(
        { providerId, providerOwnerId },
        'Direct inquiry operation rejected: not the owning provider',
      );
      throw new DomainForbiddenException(
        'PROVIDER_NOT_OWNED',
        'You do not own this provider profile',
      );
    }
  }

  private EnsureGuestContactInfo(input: CreateDirectInquiryInput): void {
    const hasContact =
      Boolean(input.name) && Boolean(input.contactEmail ?? input.contactPhone);
    if (!hasContact) {
      this.logger.warn(
        { providerId: input.providerId },
        'Direct inquiry submission rejected: missing guest contact info',
      );
      throw new DomainValidationException(
        'CONTACT_INFO_REQUIRED',
        'Provide your name and an email or phone number',
      );
    }
  }
}
