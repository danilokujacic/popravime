import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RepairRequestsRepository } from './repair-requests.repository';
import { RepairRequest } from './entities/repair-request.entity';
import {
  CreateRepairRequestInput,
  ListRepairRequestsFilter,
  RequestStatus,
} from './repair-requests.types';
import { IRepairRequestsService } from './repair-requests.service.interface';
import { RequestStatusTransitions } from './state/request-status.transitions';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import type { StorageService } from '../infra/storage/storage.service.interface';
import { STORAGE_SERVICE } from '../../common/constants/di-tokens';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notifications.types';

const STATUS_CHANGE_NOTIFIABLE = new Set<RequestStatus>([
  RequestStatus.InProgress,
  RequestStatus.Completed,
  RequestStatus.Cancelled,
]);

@Injectable()
export class RepairRequestsService implements IRepairRequestsService {
  constructor(
    private readonly repairRequestsRepository: RepairRequestsRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    @InjectPinoLogger(RepairRequestsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Create(
    customerId: string,
    input: CreateRepairRequestInput,
  ): Promise<RepairRequest> {
    const photoUrls = await this.UploadPhotos(input.photos ?? []);

    const request = await this.repairRequestsRepository.Create({
      customerId,
      categoryId: input.categoryId,
      brand: input.brand ?? null,
      model: input.model ?? null,
      description: input.description,
      photoUrls,
      cityId: input.cityId,
      urgency: input.urgency,
    });

    this.logger.info(
      { requestId: request.id, customerId, photoCount: photoUrls.length },
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

  async UpdateStatus(
    id: string,
    customerId: string,
    status: RequestStatus,
  ): Promise<RepairRequest> {
    const request = await this.FindById(id);
    this.EnsureOwnership(request, customerId);
    this.EnsureTransition(request.status, status);

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
      title: 'Repair request status changed',
      body: `Your repair request is now: ${request.status}`,
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

  async AcceptOffer(
    id: string,
    offerId: string,
    customerId: string,
  ): Promise<RepairRequest> {
    const request = await this.FindById(id);
    this.EnsureOwnership(request, customerId);
    this.EnsureTransition(request.status, RequestStatus.Accepted);

    request.status = RequestStatus.Accepted;
    request.acceptedOfferId = offerId;
    const saved = await this.repairRequestsRepository.Save(request);

    this.logger.info(
      { requestId: id, offerId, customerId },
      'Repair request offer accepted',
    );

    return saved;
  }

  private EnsureOwnership(request: RepairRequest, customerId: string): void {
    if (request.customerId !== customerId) {
      throw new DomainForbiddenException(
        'REPAIR_REQUEST_NOT_OWNED',
        'You do not own this repair request',
      );
    }
  }

  private EnsureTransition(from: RequestStatus, to: RequestStatus): void {
    if (!RequestStatusTransitions.CanTransition(from, to)) {
      throw new DomainConflictException(
        'INVALID_STATUS_TRANSITION',
        `Cannot transition repair request from ${from} to ${to}`,
      );
    }
  }
}
