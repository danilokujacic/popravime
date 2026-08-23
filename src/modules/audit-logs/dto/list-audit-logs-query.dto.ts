import { Expose } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListAuditLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  @Expose({ name: 'actor_id' })
  actorId?: string;

  @IsOptional()
  @IsString()
  @Expose({ name: 'entity_type' })
  entityType?: string;

  @IsOptional()
  @IsString()
  action?: string;
}
