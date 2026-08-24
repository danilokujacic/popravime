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
import { CreateRepairRequestDto } from './dto/create-repair-request.dto';
import { UpdateRepairRequestStatusDto } from './dto/update-repair-request-status.dto';
import { ListRepairRequestsQueryDto } from './dto/list-repair-requests-query.dto';
import { RepairRequestResponseDto } from './dto/repair-request-response.dto';
import { RepairRequestResponseMapper } from './mappers/repair-request-response.mapper';
import { ListRepairRequestsFilter } from './repair-requests.types';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

const MAX_PHOTOS = 5;

function BuildScopedFilter(
  query: ListRepairRequestsQueryDto,
  user: AuthenticatedUser,
): ListRepairRequestsFilter {
  const filter: ListRepairRequestsFilter = {
    status: query.status,
    cityId: query.cityId,
    categoryId: query.categoryId,
    urgency: query.urgency,
  };

  if (user.role === UserRole.Customer) {
    return { ...filter, customerId: user.id };
  }

  return filter;
}

@Controller('repair-requests')
export class RepairRequestsController {
  constructor(private readonly repairRequestsService: RepairRequestsService) {}

  @Get()
  async List(
    @Query() query: ListRepairRequestsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<RepairRequestResponseDto>> {
    const result = await this.repairRequestsService.List(
      BuildScopedFilter(query, user),
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
    const request = await this.repairRequestsService.FindByIdForViewer(
      id,
      user,
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
    const request = await this.repairRequestsService.Create(user.id, {
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
}
