import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IMAGE_UPLOAD_OPTIONS } from '../../common/upload/upload-limits.constants';
import { RepairRequestsService } from './repair-requests.service';
import { ProvidersService } from '../providers/providers.service';
import { CreateRepairRequestDto } from './dto/create-repair-request.dto';
import { UpdateRepairRequestStatusDto } from './dto/update-repair-request-status.dto';
import { ReviewRepairRequestDto } from './dto/review-repair-request.dto';
import { ListRepairRequestsQueryDto } from './dto/list-repair-requests-query.dto';
import { RepairRequestResponseDto } from './dto/repair-request-response.dto';
import { RepairRequestResponseMapper } from './mappers/repair-request-response.mapper';
import {
  ListRepairRequestsFilter,
  RequestStatus,
} from './repair-requests.types';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

const MAX_PHOTOS = 5;

const UNMODERATED_STATUSES: RequestStatus[] = [
  RequestStatus.PendingReview,
  RequestStatus.Rejected,
];

@Controller('repair-requests')
export class RepairRequestsController {
  constructor(
    private readonly repairRequestsService: RepairRequestsService,
    private readonly providersService: ProvidersService,
  ) {}

  @Get()
  async List(
    @Query() query: ListRepairRequestsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<RepairRequestResponseDto>> {
    const filter = await this.BuildScopedFilter(query, user);
    const result = await this.repairRequestsService.List(
      filter,
      query.page,
      query.limit,
    );

    return {
      ...result,
      items: result.items.map(RepairRequestResponseMapper.ToDto),
    };
  }

  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RepairRequestResponseDto> {
    const providerCategoryIds = await this.ResolveProviderCategoryIds(user);
    const request = await this.repairRequestsService.FindByIdForViewer(
      id,
      user,
      providerCategoryIds,
    );
    return RepairRequestResponseMapper.ToDto(request);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Customer)
  @UseInterceptors(FilesInterceptor('photos', MAX_PHOTOS, IMAGE_UPLOAD_OPTIONS))
  @Post()
  async Create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRepairRequestDto,
    @UploadedFiles() photos: Express.Multer.File[],
  ): Promise<RepairRequestResponseDto> {
    const request = await this.repairRequestsService.Create({
      customerId: user.id,
      categoryId: dto.categoryId,
      brand: dto.brand,
      model: dto.model,
      description: dto.description,
      cityId: dto.cityId,
      urgency: dto.urgency,
      photos: (photos ?? []).map((photo) => ({
        buffer: photo.buffer,
        fileName: photo.originalname,
        contentType: photo.mimetype,
      })),
    });
    return RepairRequestResponseMapper.ToDto(request);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Customer)
  @Patch(':id/status')
  async UpdateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRepairRequestStatusDto,
  ): Promise<RepairRequestResponseDto> {
    const request = await this.repairRequestsService.UpdateStatus(
      id,
      user.id,
      dto.status,
    );
    return RepairRequestResponseMapper.ToDto(request);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id/approve')
  async Approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewRepairRequestDto,
  ): Promise<RepairRequestResponseDto> {
    const request = await this.repairRequestsService.Approve(
      id,
      user.id,
      dto.reviewNotes,
    );
    return RepairRequestResponseMapper.ToDto(request);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id/reject')
  async Reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewRepairRequestDto,
  ): Promise<RepairRequestResponseDto> {
    const request = await this.repairRequestsService.Reject(
      id,
      user.id,
      dto.reviewNotes,
    );
    return RepairRequestResponseMapper.ToDto(request);
  }

  private async ResolveProviderCategoryIds(
    user: AuthenticatedUser,
  ): Promise<string[] | undefined> {
    if (user.role !== UserRole.ProviderOwner) {
      return undefined;
    }
    return this.providersService.FindCategoryIdsForOwner(user.id);
  }

  private async BuildScopedFilter(
    query: ListRepairRequestsQueryDto,
    user: AuthenticatedUser,
  ): Promise<ListRepairRequestsFilter> {
    const filter: ListRepairRequestsFilter = {
      status: query.status,
      cityId: query.cityId,
      categoryId: query.categoryId,
      urgency: query.urgency,
    };

    if (user.role === UserRole.Customer) {
      return { ...filter, customerId: user.id };
    }

    if (user.role === UserRole.ProviderOwner) {
      return {
        ...filter,
        categoryId: undefined,
        categoryIds: await this.providersService.FindCategoryIdsForOwner(
          user.id,
        ),
        status: UNMODERATED_STATUSES.includes(filter.status as RequestStatus)
          ? undefined
          : filter.status,
        excludedStatuses: UNMODERATED_STATUSES,
      };
    }

    return filter;
  }
}
