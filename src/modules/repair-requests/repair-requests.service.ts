import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Transactional } from 'typeorm-transactional';
import { RepairRequestsRepository } from './repair-requests.repository';
import { RepairRequest } from './entities/repair-request.entity';
import {
  CreateRepairRequestInput,
  ListRepairRequestsFilter,
  RequestStatus,
} from './repair-requests.types';
import { IRepairRequestsService } from './repair-requests.service.interface';
import { RequestStatusTransitions } from './state/request-status.transitions';
import { ModerationStatusTransitions } from './state/moderation-status.transitions';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import type { StorageService } from '../infra/storage/storage.service.interface';
import { STORAGE_SERVICE } from '../../common/constants/di-tokens';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProvidersService } from '../providers/providers.service';
import { CategoriesService } from '../categories/categories.service';
import { CitiesService } from '../cities/cities.service';
import { UserRole } from '../users/users.types';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { appConfig } from '../../config/app.config';

const STATUS_CHANGE_NOTIFIABLE = new Set<RequestStatus>([
  RequestStatus.InProgress,
  RequestStatus.Completed,
  RequestStatus.Cancelled,
]);

const UNMODERATED_STATUSES = new Set<RequestStatus>([
  RequestStatus.PendingReview,
  RequestStatus.Rejected,
]);

@Injectable()
export class RepairRequestsService implements IRepairRequestsService {
  constructor(
    private readonly repairRequestsRepository: RepairRequestsRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly providersService: ProvidersService,
    private readonly categoriesService: CategoriesService,
    private readonly citiesService: CitiesService,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    @InjectPinoLogger(RepairRequestsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Create(input: CreateRepairRequestInput): Promise<RepairRequest> {
    const photoUrls = await this.UploadPhotos(input.photos ?? []);

    const request = await this.repairRequestsRepository.Create({
      customerId: input.customerId,
      categoryId: input.categoryId,
      brand: input.brand ?? null,
      model: input.model ?? null,
      description: input.description,
      photoUrls,
      cityId: input.cityId,
      urgency: input.urgency,
    });

    this.logger.info(
      {
        requestId: request.id,
        customerId: input.customerId,
        photoCount: photoUrls.length,
      },
      'Repair request created',
    );

    return request;
  }

  private async UploadPhotos(
    photos: NonNullable<CreateRepairRequestInput['photos']>,
  ): Promise<string[]> {
    const uploaded = await Promise.all(
      photos.map((photo) =>
        this.storageService.Upload({
          buffer: photo.buffer,
          fileName: photo.fileName,
          contentType: photo.contentType,
        }),
      ),
    );

    return uploaded.map((result) => result.url);
  }

  async FindById(id: string): Promise<RepairRequest> {
    const request = await this.repairRequestsRepository.FindById(id);
    if (!request) {
      throw new DomainNotFoundException(
        'REPAIR_REQUEST_NOT_FOUND',
        'Repair request not found',
      );
    }
    return request;
  }

  async FindByIdForViewer(
    id: string,
    viewer: AuthenticatedUser,
    providerCategoryIds?: string[],
  ): Promise<RepairRequest> {
    const request = await this.FindById(id);
    this.EnsureViewable(request, viewer, providerCategoryIds);
    return request;
  }

  private EnsureViewable(
    request: RepairRequest,
    viewer: AuthenticatedUser,
    providerCategoryIds?: string[],
  ): void {
    if (viewer.role === UserRole.Admin) {
      return;
    }
    if (viewer.role === UserRole.ProviderOwner) {
      if (UNMODERATED_STATUSES.has(request.status)) {
        throw new DomainForbiddenException(
          'REPAIR_REQUEST_NOT_MODERATED',
          'This repair request has not been approved yet',
        );
      }
      if (
        providerCategoryIds &&
        !providerCategoryIds.includes(request.categoryId)
      ) {
        throw new DomainForbiddenException(
          'REPAIR_REQUEST_CATEGORY_NOT_SERVICED',
          'This repair request is outside your serviced categories',
        );
      }
      return;
    }
    if (request.customerId !== viewer.id) {
      throw new DomainForbiddenException(
        'REPAIR_REQUEST_NOT_OWNED',
        'You do not own this repair request',
      );
    }
  }

  List(
    filter: ListRepairRequestsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<RepairRequest>> {
    return this.repairRequestsRepository.List(filter, page, limit);
  }

  CountByStatus(): Promise<Record<RequestStatus, number>> {
    return this.repairRequestsRepository.CountByStatus();
  }

  Approve(
    id: string,
    adminId: string,
    reviewNotes?: string,
  ): Promise<RepairRequest> {
    return this.Decide(id, adminId, RequestStatus.Open, reviewNotes);
  }

  Reject(
    id: string,
    adminId: string,
    reviewNotes?: string,
  ): Promise<RepairRequest> {
    return this.Decide(id, adminId, RequestStatus.Rejected, reviewNotes);
  }

  @Transactional()
  private async Decide(
    id: string,
    adminId: string,
    status: RequestStatus.Open | RequestStatus.Rejected,
    reviewNotes?: string,
  ): Promise<RepairRequest> {
    const request = await this.FindById(id);
    this.EnsureModerationTransition(id, request.status, status);

    request.status = status;
    const saved = await this.repairRequestsRepository.Save(request);

    await this.auditLogsService.Log({
      actorId: adminId,
      action: `repair_request.${status}`,
      entityType: 'repair_request',
      entityId: id,
      metadata: reviewNotes ? { reviewNotes } : undefined,
    });

    await this.NotifyModerationDecision(saved, status);
    if (status === RequestStatus.Open) {
      await this.NotifyProvidersOfNewRequest(saved);
    }

    this.logger.info(
      { requestId: id, adminId, status },
      'Repair request reviewed',
    );

    return saved;
  }

  private async NotifyModerationDecision(
    request: RepairRequest,
    status: RequestStatus.Open | RequestStatus.Rejected,
  ): Promise<void> {
    const customer = await this.usersService.FindById(request.customerId);

    await this.notificationsService.Notify({
      userId: customer.id,
      type: NotificationType.StatusChange,
      messageKey:
        status === RequestStatus.Open
          ? 'repair_request_approved'
          : 'repair_request_rejected',
      relatedEntityType: 'repair_request',
      relatedEntityId: request.id,
      email: {
        kind: 'status-change',
        payload: {
          to: customer.email,
          customerName: customer.fullName,
          status: request.status,
          requestId: request.id,
        },
      },
    });
  }

  // Only reachable once a request is Open — pending_review/rejected requests aren't viewable by
  // providers yet (EnsureViewable throws REPAIR_REQUEST_NOT_MODERATED), so notifying them any
  // earlier would hand out a preview link that 403s.
  private async NotifyProvidersOfNewRequest(
    request: RepairRequest,
  ): Promise<void> {
    const [category, city, providers] = await Promise.all([
      this.categoriesService.FindById(request.categoryId),
      this.citiesService.FindById(request.cityId),
      this.providersService.ListEligibleForCategory(request.categoryId),
    ]);

    const previewUrl = `${this.app.frontendUrl}/provider/requests/${request.id}`;

    await Promise.all(
      providers.map((provider) =>
        this.notificationsService.Notify({
          userId: provider.ownerUserId,
          type: NotificationType.NewRepairRequest,
          messageKey: 'new_repair_request',
          messageParams: {
            categorySlug: category.slug,
            cityName: city.name,
          },
          relatedEntityType: 'repair_request',
          relatedEntityId: request.id,
          email: {
            kind: 'new-repair-request',
            payload: {
              to: provider.ownerUser.email,
              providerName: provider.ownerUser.fullName,
              categoryName: category.name,
              cityName: city.name,
              previewUrl,
            },
          },
        }),
      ),
    );

    this.logger.info(
      {
        requestId: request.id,
        categoryId: request.categoryId,
        providerCount: providers.length,
      },
      'Providers notified of new repair request',
    );
  }

  private EnsureModerationTransition(
    id: string,
    from: RequestStatus,
    to: RequestStatus,
  ): void {
    if (!ModerationStatusTransitions.CanTransition(from, to)) {
      this.logger.warn(
        { requestId: id, from, to },
        'Repair request moderation decision rejected: invalid status transition',
      );
      throw new DomainConflictException(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition repair request from ${from} to ${to}`,
      );
    }
  }

  @Transactional()
  async UpdateStatus(
    id: string,
    customerId: string,
    status: RequestStatus,
  ): Promise<RepairRequest> {
    const request = await this.FindById(id);
    this.EnsureOwnership(request, customerId);
    this.EnsureTransition(id, request.status, status);

    request.status = status;
    const saved = await this.repairRequestsRepository.Save(request);

    if (STATUS_CHANGE_NOTIFIABLE.has(status)) {
      await this.NotifyStatusChange(saved);
    }

    this.logger.info(
      { requestId: id, customerId, status },
      'Repair request status changed',
    );

    return saved;
  }

  private async NotifyStatusChange(request: RepairRequest): Promise<void> {
    const customer = await this.usersService.FindById(request.customerId);

    await this.notificationsService.Notify({
      userId: customer.id,
      type: NotificationType.StatusChange,
      messageKey: 'repair_request_status_changed',
      messageParams: { status: request.status },
      relatedEntityType: 'repair_request',
      relatedEntityId: request.id,
      email: {
        kind: 'status-change',
        payload: {
          to: customer.email,
          customerName: customer.fullName,
          status: request.status,
          requestId: request.id,
        },
      },
    });
  }

  async MarkOffersReceived(id: string): Promise<void> {
    const request = await this.FindById(id);
    if (request.status !== RequestStatus.Open) {
      return;
    }

    request.status = RequestStatus.OffersReceived;
    await this.repairRequestsRepository.Save(request);

    this.logger.info(
      { requestId: id },
      'Repair request marked as offers_received',
    );
  }

  @Transactional()
  async AcceptOffer(
    id: string,
    offerId: string,
    customerId: string,
  ): Promise<RepairRequest> {
    const request = await this.FindById(id);
    this.EnsureOwnership(request, customerId);
    this.EnsureTransition(id, request.status, RequestStatus.Accepted);

    const accepted = await this.repairRequestsRepository.TryAccept(
      id,
      offerId,
      [RequestStatus.OffersReceived],
    );
    if (!accepted) {
      this.logger.warn(
        { requestId: id, offerId, customerId },
        'Repair request offer acceptance lost the race to another offer',
      );
      throw new DomainConflictException(
        'REPAIR_REQUEST_ALREADY_ACCEPTED',
        'This repair request already has an accepted offer',
      );
    }

    request.status = RequestStatus.Accepted;
    request.acceptedOfferId = offerId;

    this.logger.info(
      { requestId: id, offerId, customerId },
      'Repair request offer accepted',
    );

    return request;
  }

  private EnsureOwnership(request: RepairRequest, customerId: string): void {
    if (request.customerId !== customerId) {
      this.logger.warn(
        { requestId: request.id, customerId },
        'Repair request operation rejected: not the owning customer',
      );
      throw new DomainForbiddenException(
        'REPAIR_REQUEST_NOT_OWNED',
        'You do not own this repair request',
      );
    }
  }

  private EnsureTransition(
    id: string,
    from: RequestStatus,
    to: RequestStatus,
  ): void {
    if (!RequestStatusTransitions.CanTransition(from, to)) {
      this.logger.warn(
        { requestId: id, from, to },
        'Repair request status change rejected: invalid status transition',
      );
      throw new DomainConflictException(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition repair request from ${from} to ${to}`,
      );
    }
  }
}
