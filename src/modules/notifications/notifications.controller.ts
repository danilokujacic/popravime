import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationResponseMapper } from './mappers/notification-response.mapper';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async List(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<PaginatedResult<NotificationResponseDto>> {
    const result = await this.notificationsService.ListForUser(
      user.id,
      query.page,
      query.limit,
    );
    return {
      ...result,
      items: result.items.map(NotificationResponseMapper.ToDto),
    };
  }

  @Patch(':id/read')
  async MarkRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.MarkRead(id, user.id);
    return NotificationResponseMapper.ToDto(notification);
  }
}
