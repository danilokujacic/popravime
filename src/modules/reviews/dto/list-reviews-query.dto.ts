import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListReviewsQueryDto extends PaginationQueryDto {
  @IsUUID()
  @Expose({ name: 'provider_id' })
  providerId: string;
}
