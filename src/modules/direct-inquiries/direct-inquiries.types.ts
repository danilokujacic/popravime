export enum InquiryStatus {
  New = 'new',
  Contacted = 'contacted',
  Closed = 'closed',
}

export interface CreateDirectInquiryInput {
  providerId: string;
  customerId?: string;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  message: string;
}

export interface ListDirectInquiriesFilter {
  providerId: string;
  status?: InquiryStatus;
}
