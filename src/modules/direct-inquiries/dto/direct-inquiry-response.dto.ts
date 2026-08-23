import { InquiryStatus } from '../direct-inquiries.types';

export class DirectInquiryResponseDto {
  id: string;
  customerId: string | null;
  providerId: string;
  name: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: Date;
}
