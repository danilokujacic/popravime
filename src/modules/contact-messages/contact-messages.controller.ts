import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ContactMessagesService } from './contact-messages.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message-status.dto';
import { ListContactMessagesQueryDto } from './dto/list-contact-messages-query.dto';
import { ContactMessageResponseDto } from './dto/contact-message-response.dto';
import { ContactMessageResponseMapper } from './mappers/contact-message-response.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Controller('contact-messages')
export class ContactMessagesController {
  constructor(
    private readonly contactMessagesService: ContactMessagesService,
  ) {}

  @Public()
  @Post()
  async Create(
    @Body() dto: CreateContactMessageDto,
  ): Promise<ContactMessageResponseDto> {
    const message = await this.contactMessagesService.Create({
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
    });
    return ContactMessageResponseMapper.ToDto(message);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Get()
  async List(
    @Query() query: ListContactMessagesQueryDto,
  ): Promise<PaginatedResult<ContactMessageResponseDto>> {
    const result = await this.contactMessagesService.List(
      { status: query.status },
      query.page,
      query.limit,
    );
    return {
      ...result,
      items: result.items.map(ContactMessageResponseMapper.ToDto),
    };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id/status')
  async UpdateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactMessageStatusDto,
  ): Promise<ContactMessageResponseDto> {
    const message = await this.contactMessagesService.UpdateStatus(
      id,
      dto.status,
    );
    return ContactMessageResponseMapper.ToDto(message);
  }
}
