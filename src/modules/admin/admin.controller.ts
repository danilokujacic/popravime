import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminAnalyticsService } from './analytics/admin-analytics.service';
import { AdminAnalyticsResponseDto } from './dto/admin-analytics-response.dto';
import { AdminAnalyticsResponseMapper } from './mappers/admin-analytics-response.mapper';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/users.types';

@UseGuards(RolesGuard)
@Roles(UserRole.Admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('analytics')
  async Analytics(): Promise<AdminAnalyticsResponseDto> {
    const analytics = await this.adminAnalyticsService.Overview();
    return AdminAnalyticsResponseMapper.ToDto(analytics);
  }
}
