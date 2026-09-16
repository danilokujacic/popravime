import { RepairRequest } from './entities/repair-request.entity';
import {
  CreateRepairRequestInput,
  ListRepairRequestsFilter,
  RequestStatus,
} from './repair-requests.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

export interface IRepairRequestsService {
  Create(input: CreateRepairRequestInput): Promise<RepairRequest>;
  FindById(id: string): Promise<RepairRequest>;
  FindByIdForViewer(
    id: string,
    viewer: AuthenticatedUser,
  ): Promise<RepairRequest>;
  List(
    filter: ListRepairRequestsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<RepairRequest>>;
  UpdateStatus(
    id: string,
    customerId: string,
    status: RequestStatus,
  ): Promise<RepairRequest>;
  MarkOffersReceived(id: string): Promise<void>;
  AcceptOffer(
    id: string,
    offerId: string,
    customerId: string,
  ): Promise<RepairRequest>;
  Reopen(id: string, customerId: string): Promise<RepairRequest>;
  NotifyProvidersOfNewRequest(request: RepairRequest): Promise<void>;
  Approve(
    id: string,
    adminId: string,
    reviewNotes?: string,
  ): Promise<RepairRequest>;
  Reject(
    id: string,
    adminId: string,
    reviewNotes?: string,
  ): Promise<RepairRequest>;
  CountByStatus(): Promise<Record<RequestStatus, number>>;
}
