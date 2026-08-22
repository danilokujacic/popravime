import { Expose } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { VerificationStatus } from '../providers.types';

export class ListProvidersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  @Expose({ name: 'city_id' })
  cityId?: string;

  @IsOptional()
  @IsUUID()
  @Expose({ name: 'category_id' })
  categoryId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(VerificationStatus)
  @Expose({ name: 'verification_status' })
  verificationStatus?: VerificationStatus;
}
