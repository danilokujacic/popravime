import { RepairRequest } from './entities/repair-request.entity';
import {
  CreateRepairRequestInput,
  ListRepairRequestsFilter,
  RequestStatus,
} from './repair-requests.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IRepairRequestsService {
  Create(
    customerId: string,
    input: CreateRepairRequestInput,
  ): Promise<RepairRequest>;
  FindById(id: string): Promise<RepairRequest>;
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
}
