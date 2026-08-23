import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogResponseDto } from './dto/audit-log-response.dto';
import { AuditLogResponseMapper } from './mappers/audit-log-response.mapper';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@UseGuards(RolesGuard)
@Roles(UserRole.Admin)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async List(
    @Query() query: ListAuditLogsQueryDto,
  ): Promise<PaginatedResult<AuditLogResponseDto>> {
    const result = await this.auditLogsService.List(
      {
        actorId: query.actorId,
        entityType: query.entityType,
        action: query.action,
      },
      query.page,
      query.limit,
    );
    return { ...result, items: result.items.map(AuditLogResponseMapper.ToDto) };
  }
}
