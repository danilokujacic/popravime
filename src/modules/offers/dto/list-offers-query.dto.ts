import { Expose } from 'class-transformer';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OfferStatus } from '../offers.types';

export class ListOffersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  @Expose({ name: 'request_id' })
  requestId?: string;

  @IsOptional()
  @IsUUID()
  @Expose({ name: 'provider_id' })
  providerId?: string;

  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;
}
