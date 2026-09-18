import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { AdminProvidersService } from './providers/admin-providers.service';
import { AdminAnalyticsResponseDto } from './dto/admin-analytics-response.dto';
import { AdminProviderResponseDto } from './dto/admin-provider-response.dto';
import { ListAdminProvidersQueryDto } from './dto/list-admin-providers-query.dto';
import { SetProviderApprovalDto } from './dto/set-provider-approval.dto';
import { AdminAnalyticsResponseMapper } from './mappers/admin-analytics-response.mapper';
import { AdminProviderResponseMapper } from './mappers/admin-provider-response.mapper';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { UserRole } from '../users/users.types';

@UseGuards(RolesGuard)
@Roles(UserRole.Admin)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminAnalyticsService: AdminAnalyticsService,
    private readonly adminProvidersService: AdminProvidersService,
  ) {}

  @Get('analytics')
  async Analytics(): Promise<AdminAnalyticsResponseDto> {
    const analytics = await this.adminAnalyticsService.Overview();
    return AdminAnalyticsResponseMapper.ToDto(analytics);
  }

  @Get('providers')
  async ListProviders(
    @Query() query: ListAdminProvidersQueryDto,
  ): Promise<PaginatedResult<AdminProviderResponseDto>> {
    const result = await this.adminProvidersService.List(
      query.approved,
      query.page,
      query.limit,
    );
    return {
      ...result,
      items: result.items.map(AdminProviderResponseMapper.ToDto),
    };
  }

  @Patch('providers/:id/approval')
  async SetProviderApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: SetProviderApprovalDto,
  ): Promise<AdminProviderResponseDto> {
    const provider = await this.adminProvidersService.SetApproval(
      admin.id,
      id,
      dto.approved,
    );
    return AdminProviderResponseMapper.ToDto(provider);
  }
}
