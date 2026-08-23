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
import { DirectInquiriesService } from './direct-inquiries.service';
import { CreateDirectInquiryDto } from './dto/create-direct-inquiry.dto';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';
import { ListDirectInquiriesQueryDto } from './dto/list-direct-inquiries-query.dto';
import { DirectInquiryResponseDto } from './dto/direct-inquiry-response.dto';
import { DirectInquiryResponseMapper } from './mappers/direct-inquiry-response.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { OptionalUser } from '../../common/decorators/optional-user.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Controller('direct-inquiries')
export class DirectInquiriesController {
  constructor(
    private readonly directInquiriesService: DirectInquiriesService,
  ) {}

  @Public()
  @UseGuards(OptionalAuthGuard)
  @Post()
  async Create(
    @OptionalUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateDirectInquiryDto,
  ): Promise<DirectInquiryResponseDto> {
    const inquiry = await this.directInquiriesService.Create({
      providerId: dto.providerId,
      customerId: user?.id,
      name: dto.name,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      message: dto.message,
    });
    return DirectInquiryResponseMapper.ToDto(inquiry);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Get()
  async List(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDirectInquiriesQueryDto,
  ): Promise<PaginatedResult<DirectInquiryResponseDto>> {
    const result = await this.directInquiriesService.List(
      { providerId: query.providerId, status: query.status },
      user.id,
      query.page,
      query.limit,
    );
    return {
      ...result,
      items: result.items.map(DirectInquiryResponseMapper.ToDto),
    };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DirectInquiryResponseDto> {
    const inquiry = await this.directInquiriesService.FindById(id, user.id);
    return DirectInquiryResponseMapper.ToDto(inquiry);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Patch(':id/status')
  async UpdateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateInquiryStatusDto,
  ): Promise<DirectInquiryResponseDto> {
    const inquiry = await this.directInquiriesService.UpdateStatus(
      id,
      user.id,
      dto.status,
    );
    return DirectInquiryResponseMapper.ToDto(inquiry);
  }
}
