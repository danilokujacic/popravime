import { Expose } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { InquiryStatus } from '../direct-inquiries.types';

export class ListDirectInquiriesQueryDto extends PaginationQueryDto {
  @IsUUID()
  @Expose({ name: 'provider_id' })
  providerId: string;

  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;
}
