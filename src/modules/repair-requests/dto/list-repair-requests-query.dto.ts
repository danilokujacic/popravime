import { Expose } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { RequestStatus, Urgency } from '../repair-requests.types';

export class ListRepairRequestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsUUID()
  @Expose({ name: 'city_id' })
  cityId?: string;

  @IsOptional()
  @IsUUID()
  @Expose({ name: 'category_id' })
  categoryId?: string;

  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;
}
