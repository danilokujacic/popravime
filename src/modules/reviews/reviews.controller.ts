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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondToReviewDto } from './dto/respond-to-review.dto';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { ReviewResponseMapper } from './mappers/review-response.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  async List(
    @Query() query: ListReviewsQueryDto,
  ): Promise<PaginatedResult<ReviewResponseDto>> {
    const result = await this.reviewsService.ListForProvider(
      query.providerId,
      query.page,
      query.limit,
    );
    return { ...result, items: result.items.map(ReviewResponseMapper.ToDto) };
  }

  @Public()
  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.FindById(id);
    return ReviewResponseMapper.ToDto(review);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Customer)
  @Post()
  async Create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.Create(user.id, {
      requestId: dto.requestId,
      rating: dto.rating,
      comment: dto.comment,
    });
    return ReviewResponseMapper.ToDto(review);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ProviderOwner)
  @Patch(':id/response')
  async RespondTo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondToReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.reviewsService.RespondTo(
      id,
      user.id,
      dto.response,
    );
    return ReviewResponseMapper.ToDto(review);
  }
}
