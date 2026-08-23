import { IsEnum } from 'class-validator';
import { InquiryStatus } from '../direct-inquiries.types';

export class UpdateInquiryStatusDto {
  @IsEnum(InquiryStatus)
  status: InquiryStatus;
}
