import { DirectInquiry } from './entities/direct-inquiry.entity';
import {
  CreateDirectInquiryInput,
  InquiryStatus,
  ListDirectInquiriesFilter,
} from './direct-inquiries.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IDirectInquiriesService {
  Create(input: CreateDirectInquiryInput): Promise<DirectInquiry>;
  FindById(id: string, providerOwnerId: string): Promise<DirectInquiry>;
  Get(id: string): Promise<DirectInquiry>;
  List(
    filter: ListDirectInquiriesFilter,
    providerOwnerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<DirectInquiry>>;
  UpdateStatus(
    id: string,
    providerOwnerId: string,
    status: InquiryStatus,
  ): Promise<DirectInquiry>;
}
