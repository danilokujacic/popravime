import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VerificationRequestStatus } from '../verification-requests.types';

export class ListVerificationRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VerificationRequestStatus)
  status?: VerificationRequestStatus;
}
