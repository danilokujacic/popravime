import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FaqItemsService } from './faq-items.service';
import { CreateFaqItemDto } from './dto/create-faq-item.dto';
import { UpdateFaqItemDto } from './dto/update-faq-item.dto';
import { FaqItemResponseDto } from './dto/faq-item-response.dto';
import { FaqItemResponseMapper } from './mappers/faq-item-response.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';

@Controller('faq-items')
export class FaqItemsController {
  constructor(private readonly faqItemsService: FaqItemsService) {}

  @Public()
  @Get()
  async List(): Promise<FaqItemResponseDto[]> {
    const items = await this.faqItemsService.List();
    return items.map(FaqItemResponseMapper.ToDto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Post()
  async Create(
    @Body() dto: CreateFaqItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FaqItemResponseDto> {
    const item = await this.faqItemsService.Create(user.id, {
      question: dto.question,
      answer: dto.answer,
      category: dto.category,
      sortOrder: dto.sortOrder,
    });
    return FaqItemResponseMapper.ToDto(item);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id')
  async Update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaqItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FaqItemResponseDto> {
    const item = await this.faqItemsService.Update(id, user.id, {
      question: dto.question,
      answer: dto.answer,
      category: dto.category,
      sortOrder: dto.sortOrder,
    });
    return FaqItemResponseMapper.ToDto(item);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Delete(':id')
  Remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.faqItemsService.Delete(id, user.id);
  }
}
