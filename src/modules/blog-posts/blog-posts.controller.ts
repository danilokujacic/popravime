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
import { BlogPostsService } from './blog-posts.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { ListBlogPostsQueryDto } from './dto/list-blog-posts-query.dto';
import { BlogPostResponseDto } from './dto/blog-post-response.dto';
import { BlogPostResponseMapper } from './mappers/blog-post-response.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Controller('blog-posts')
export class BlogPostsController {
  constructor(private readonly blogPostsService: BlogPostsService) {}

  @Public()
  @Get()
  async List(
    @Query() query: ListBlogPostsQueryDto,
  ): Promise<PaginatedResult<BlogPostResponseDto>> {
    const result = await this.blogPostsService.ListPublished(
      query.page,
      query.limit,
    );
    return { ...result, items: result.items.map(BlogPostResponseMapper.ToDto) };
  }

  @Public()
  @Get(':slug')
  async FindOne(@Param('slug') slug: string): Promise<BlogPostResponseDto> {
    const post = await this.blogPostsService.FindPublishedBySlug(slug);
    return BlogPostResponseMapper.ToDto(post);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Get('admin/:id')
  async FindOneForAdmin(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BlogPostResponseDto> {
    const post = await this.blogPostsService.FindById(id);
    return BlogPostResponseMapper.ToDto(post);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Post()
  async Create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBlogPostDto,
  ): Promise<BlogPostResponseDto> {
    const post = await this.blogPostsService.Create(user.id, {
      title: dto.title,
      content: dto.content,
      coverImageUrl: dto.coverImageUrl,
      tags: dto.tags,
      publish: dto.publish,
    });
    return BlogPostResponseMapper.ToDto(post);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id')
  async Update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogPostDto,
  ): Promise<BlogPostResponseDto> {
    const post = await this.blogPostsService.Update(id, {
      title: dto.title,
      content: dto.content,
      coverImageUrl: dto.coverImageUrl,
      tags: dto.tags,
      publish: dto.publish,
    });
    return BlogPostResponseMapper.ToDto(post);
  }
}
