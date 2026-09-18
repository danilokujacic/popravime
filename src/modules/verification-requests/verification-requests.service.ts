import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from 'typeorm-transactional';
import { VerificationRequestsRepository } from './verification-requests.repository';
import { VerificationRequest } from './entities/verification-request.entity';
import {
  ListVerificationRequestsFilter,
  SubmitVerificationRequestInput,
  VerificationRequestStatus,
} from './verification-requests.types';
import { IVerificationRequestsService } from './verification-requests.service.interface';
import { VerificationStatusTransitions } from './state/verification-status.transitions';
import { ProvidersService } from '../providers/providers.service';
import { VerificationStatus } from '../providers/providers.types';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { StorageService } from '../infra/storage/storage.service.interface';
import { STORAGE_SERVICE } from '../../common/constants/di-tokens';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';

@Injectable()
export class VerificationRequestsService implements IVerificationRequestsService {
  constructor(
    private readonly verificationRequestsRepository: VerificationRequestsRepository,
    private readonly providersService: ProvidersService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    @InjectPinoLogger(VerificationRequestsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Submit(
    providerOwnerId: string,
    input: SubmitVerificationRequestInput,
  ): Promise<VerificationRequest> {
    const provider = await this.providersService.FindById(input.providerId);
    this.EnsureProviderOwnership(provider.ownerUserId, providerOwnerId);
    await this.EnsureNoPendingRequest(input.providerId);

    const uploaded = await this.storageService.UploadPrivate(input.document);

    const request = await this.verificationRequestsRepository.Create({
      providerId: input.providerId,
      documentUrl: uploaded.reference,
      aprNumber: input.aprNumber,
    });

    this.logger.info(
      { verificationRequestId: request.id, providerId: input.providerId },
      'Verification request submitted',
    );

    return request;
  }

  Approve(
    id: string,
    adminId: string,
    reviewNotes?: string,
  ): Promise<VerificationRequest> {
    return this.Decide(
      id,
      adminId,
      VerificationRequestStatus.Approved,
      reviewNotes,
    );
  }

  Reject(
    id: string,
    adminId: string,
    reviewNotes?: string,
  ): Promise<VerificationRequest> {
    return this.Decide(
      id,
      adminId,
      VerificationRequestStatus.Rejected,
      reviewNotes,
    );
  }

  async FindById(id: string): Promise<VerificationRequest> {
    const request = await this.verificationRequestsRepository.FindById(id);
    if (!request) {
      throw new DomainNotFoundException(
        'VERIFICATION_REQUEST_NOT_FOUND',
        'Verification request not found',
      );
    }
    return request;
  }

  List(
    filter: ListVerificationRequestsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<VerificationRequest>> {
    return this.verificationRequestsRepository.List(filter, page, limit);
  }

  @Transactional()
  private async Decide(
    id: string,
    adminId: string,
    status:
      VerificationRequestStatus.Approved | VerificationRequestStatus.Rejected,
    reviewNotes?: string,
  ): Promise<VerificationRequest> {
    const request = await this.FindById(id);
    this.EnsureTransition(request.status, status);

    request.status = status;
    request.reviewedByAdminId = adminId;
    request.reviewNotes = reviewNotes ?? null;
    request.reviewedAt = new Date();
    const saved = await this.verificationRequestsRepository.Save(request);

    const provider = await this.providersService.UpdateVerificationStatus(
      request.providerId,
      {
        verificationStatus: this.ToProviderVerificationStatus(status),
        isCertified: status === VerificationRequestStatus.Approved,
      },
    );

    await this.NotifyProviderOwner(
      provider.ownerUserId,
      provider.businessName,
      status,
      reviewNotes ?? null,
    );

    await this.auditLogsService.Log({
      actorId: adminId,
      action: `verification_request.${status}`,
      entityType: 'verification_request',
      entityId: id,
      metadata: reviewNotes ? { reviewNotes } : undefined,
    });

    this.logger.info(
      { verificationRequestId: id, adminId, status },
      'Verification request reviewed',
    );

    return saved;
  }

  private async NotifyProviderOwner(
    providerOwnerId: string,
    providerName: string,
    status:
      VerificationRequestStatus.Approved | VerificationRequestStatus.Rejected,
    reviewNotes: string | null,
  ): Promise<void> {
    const providerOwner = await this.usersService.FindById(providerOwnerId);

    if (status === VerificationRequestStatus.Approved) {
      await this.notificationsService.Notify({
        userId: providerOwner.id,
        type: NotificationType.VerificationApproved,
        messageKey: 'verification_approved',
        email: {
          kind: 'verification-approved',
          payload: {
            to: providerOwner.email,
            locale: providerOwner.locale,
            providerName,
          },
        },
      });
      return;
    }

    await this.notificationsService.Notify({
      userId: providerOwner.id,
      type: NotificationType.VerificationRejected,
      messageKey: 'verification_rejected',
      email: {
        kind: 'verification-rejected',
        payload: {
          to: providerOwner.email,
          locale: providerOwner.locale,
          providerName,
          reviewNotes,
        },
      },
    });
  }

  private ToProviderVerificationStatus(
    status:
      VerificationRequestStatus.Approved | VerificationRequestStatus.Rejected,
  ): VerificationStatus {
    if (status === VerificationRequestStatus.Approved) {
      return VerificationStatus.Verified;
    }
    return VerificationStatus.Rejected;
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

  private async EnsureNoPendingRequest(providerId: string): Promise<void> {
    const exists =
      await this.verificationRequestsRepository.ExistsPending(providerId);
    if (exists) {
      throw new DomainConflictException(
        'VERIFICATION_REQUEST_ALREADY_PENDING',
        'This provider already has a pending verification request',
      );
    }
  }

  private EnsureTransition(
    from: VerificationRequestStatus,
    to: VerificationRequestStatus,
  ): void {
    if (!VerificationStatusTransitions.CanTransition(from, to)) {
      throw new DomainConflictException(
        'INVALID_VERIFICATION_TRANSITION',
        `Cannot transition verification request from ${from} to ${to}`,
      );
    }
  }
}
