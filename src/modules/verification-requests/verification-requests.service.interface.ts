import { VerificationRequest } from './entities/verification-request.entity';
import {
  ListVerificationRequestsFilter,
  SubmitVerificationRequestInput,
} from './verification-requests.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IVerificationRequestsService {
  Submit(
    providerOwnerId: string,
    input: SubmitVerificationRequestInput,
  ): Promise<VerificationRequest>;
  Approve(
    id: string,
    adminId: string,
    reviewNotes?: string,
  ): Promise<VerificationRequest>;
  Reject(
    id: string,
    adminId: string,
    reviewNotes?: string,
  ): Promise<VerificationRequest>;
  FindById(id: string): Promise<VerificationRequest>;
  List(
    filter: ListVerificationRequestsFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<VerificationRequest>>;
}
