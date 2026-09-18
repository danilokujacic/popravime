import {
  Body,
  Controller,
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
import { DOCUMENT_UPLOAD_OPTIONS } from '../../common/upload/upload-limits.constants';
import { VerificationRequestsService } from './verification-requests.service';
import { SubmitVerificationRequestDto } from './dto/submit-verification-request.dto';
import { ReviewVerificationRequestDto } from './dto/review-verification-request.dto';
import { ListVerificationRequestsQueryDto } from './dto/list-verification-requests-query.dto';
import { VerificationRequestResponseDto } from './dto/verification-request-response.dto';
import { VerificationRequestResponseMapper } from './mappers/verification-request-response.mapper';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PrivateFileUrlInterceptor } from '../infra/storage/private-file-url.interceptor';

@UseGuards(RolesGuard)
@Controller('verification-requests')
@UseInterceptors(PrivateFileUrlInterceptor)
export class VerificationRequestsController {
  constructor(
    private readonly verificationRequestsService: VerificationRequestsService,
  ) {}

  @Roles(UserRole.ProviderOwner)
  @UseInterceptors(FileInterceptor('document', DOCUMENT_UPLOAD_OPTIONS))
  @Post()
  async Submit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitVerificationRequestDto,
    @UploadedFile() document: Express.Multer.File,
  ): Promise<VerificationRequestResponseDto> {
    const request = await this.verificationRequestsService.Submit(user.id, {
      providerId: dto.providerId,
      aprNumber: dto.aprNumber,
      document: {
        buffer: document.buffer,
        fileName: document.originalname,
        contentType: document.mimetype,
      },
    });
    return VerificationRequestResponseMapper.ToDto(request);
  }

  @Roles(UserRole.Admin)
  @Get()
  async List(
    @Query() query: ListVerificationRequestsQueryDto,
  ): Promise<PaginatedResult<VerificationRequestResponseDto>> {
    const result = await this.verificationRequestsService.List(
      { status: query.status },
      query.page,
      query.limit,
    );
    return {
      ...result,
      items: result.items.map(VerificationRequestResponseMapper.ToDto),
    };
  }

  @Roles(UserRole.Admin)
  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VerificationRequestResponseDto> {
    const request = await this.verificationRequestsService.FindById(id);
    return VerificationRequestResponseMapper.ToDto(request);
  }

  @Roles(UserRole.Admin)
  @Patch(':id/approve')
  async Approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewVerificationRequestDto,
  ): Promise<VerificationRequestResponseDto> {
    const request = await this.verificationRequestsService.Approve(
      id,
      user.id,
      dto.reviewNotes,
    );
    return VerificationRequestResponseMapper.ToDto(request);
  }

  @Roles(UserRole.Admin)
  @Patch(':id/reject')
  async Reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReviewVerificationRequestDto,
  ): Promise<VerificationRequestResponseDto> {
    const request = await this.verificationRequestsService.Reject(
      id,
      user.id,
      dto.reviewNotes,
    );
    return VerificationRequestResponseMapper.ToDto(request);
  }
}
