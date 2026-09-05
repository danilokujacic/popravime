import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IMAGE_UPLOAD_OPTIONS } from '../../common/upload/upload-limits.constants';
import { ProvidersService } from './providers.service';
import { ProviderGalleryService } from './provider-gallery.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ListProvidersQueryDto } from './dto/list-providers-query.dto';
import { AddGalleryImageDto } from './dto/add-gallery-image.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { ProviderGalleryResponseDto } from './dto/provider-gallery-response.dto';
import { ProviderResponseMapper } from './mappers/provider-response.mapper';
import { ProviderGalleryResponseMapper } from './mappers/provider-gallery-response.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Controller('providers')
export class ProvidersController {
  constructor(
    private readonly providersService: ProvidersService,
    private readonly providerGalleryService: ProviderGalleryService,
  ) {}

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Get('me')
  async GetProviderForUser(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providersService.GetForUser(user.id);

    return ProviderResponseMapper.ToDto(provider);
  }

  @Public()
  @Get()
  async List(
    @Query() query: ListProvidersQueryDto,
  ): Promise<PaginatedResult<ProviderResponseDto>> {
    const result = await this.providersService.List(
      {
        cityId: query.cityId,
        categoryId: query.categoryId,
        search: query.search,
      },
      query.page,
      query.limit,
    );

    return { ...result, items: result.items.map(ProviderResponseMapper.ToDto) };
  }

  @Public()
  @Get('slug/:slug')
  async FindBySlug(@Param('slug') slug: string): Promise<ProviderResponseDto> {
    const provider = await this.providersService.FindBySlug(slug);
    return ProviderResponseMapper.ToDto(provider);
  }

  @Public()
  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providersService.FindById(id);
    return ProviderResponseMapper.ToDto(provider);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Post()
  async Create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProviderDto,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providersService.Create(user.id, {
      businessName: dto.businessName,
      description: dto.description,
      address: dto.address,
      cityId: dto.cityId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      phone: dto.phone,
      email: dto.email,
      website: dto.website,
      workingHours: dto.workingHours,
      categoryIds: dto.categoryIds,
    });
    return ProviderResponseMapper.ToDto(provider);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Patch(':id')
  async Update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProviderDto,
  ): Promise<ProviderResponseDto> {
    const provider = await this.providersService.Update(id, user.id, {
      businessName: dto.businessName,
      description: dto.description,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      phone: dto.phone,
      email: dto.email,
      website: dto.website,
      workingHours: dto.workingHours,
    });
    return ProviderResponseMapper.ToDto(provider);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Delete(':id')
  Remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.providersService.Delete(id, user.id);
  }

  @Public()
  @Get(':id/gallery')
  async ListGallery(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProviderGalleryResponseDto[]> {
    const images = await this.providerGalleryService.List(id);
    return images.map(ProviderGalleryResponseMapper.ToDto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @UseInterceptors(FileInterceptor('file', IMAGE_UPLOAD_OPTIONS))
  @Post(':id/gallery')
  async AddGalleryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AddGalleryImageDto,
  ): Promise<ProviderGalleryResponseDto> {
    const image = await this.providerGalleryService.Add(id, user.id, {
      buffer: file.buffer,
      fileName: file.originalname,
      contentType: file.mimetype,
      caption: dto.caption,
    });
    return ProviderGalleryResponseMapper.ToDto(image);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Delete(':id/gallery/:imageId')
  RemoveGalleryImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.providerGalleryService.Delete(id, imageId, user.id);
  }
}
