import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { BlogPostsRepository } from './blog-posts.repository';
import { BlogPost } from './entities/blog-post.entity';
import { CreateBlogPostInput, UpdateBlogPostInput } from './blog-posts.types';
import { IBlogPostsService } from './blog-posts.service.interface';
import { SlugGenerator } from '../../shared/slug/slug.generator';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

@Injectable()
export class BlogPostsService implements IBlogPostsService {
  constructor(
    private readonly blogPostsRepository: BlogPostsRepository,
    @InjectPinoLogger(BlogPostsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Create(
    authorId: string,
    input: CreateBlogPostInput,
  ): Promise<BlogPost> {
    const slug = await SlugGenerator.GenerateUnique(input.title, (candidate) =>
      this.blogPostsRepository.SlugExists(candidate),
    );

    const post = await this.blogPostsRepository.Create({
      authorId,
      title: input.title,
      slug,
      content: input.content,
      coverImageUrl: input.coverImageUrl ?? null,
      tags: input.tags ?? [],
      publishedAt: input.publish ? new Date() : null,
    });

    this.logger.info({ blogPostId: post.id, authorId }, 'Blog post created');

    return post;
  }

  async Update(id: string, input: UpdateBlogPostInput): Promise<BlogPost> {
    const post = await this.FindById(id);

    ApplyTextFields(post, input);
    ApplyMetaFields(post, input);
    ApplyPublishState(post, input);

    const saved = await this.blogPostsRepository.Save(post);
    this.logger.info({ blogPostId: id }, 'Blog post updated');

    return saved;
  }

  async FindPublishedBySlug(slug: string): Promise<BlogPost> {
    const post = await this.blogPostsRepository.FindBySlug(slug);
    if (!post || !this.IsPublished(post)) {
      throw new DomainNotFoundException(
        'BLOG_POST_NOT_FOUND',
        'Blog post not found',
      );
    }
    return post;
  }

  async FindById(id: string): Promise<BlogPost> {
    const post = await this.blogPostsRepository.FindById(id);
    if (!post) {
      throw new DomainNotFoundException(
        'BLOG_POST_NOT_FOUND',
        'Blog post not found',
      );
    }
    return post;
  }

  ListPublished(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BlogPost>> {
    return this.blogPostsRepository.ListPublished(page, limit);
  }

  private IsPublished(post: BlogPost): boolean {
    return (
      post.publishedAt !== null && post.publishedAt.getTime() <= Date.now()
    );
  }
}

function ApplyTextFields(post: BlogPost, input: UpdateBlogPostInput): void {
  if (input.title !== undefined) {
    post.title = input.title;
  }
  if (input.content !== undefined) {
    post.content = input.content;
  }
}

function ApplyMetaFields(post: BlogPost, input: UpdateBlogPostInput): void {
  if (input.coverImageUrl !== undefined) {
    post.coverImageUrl = input.coverImageUrl;
  }
  if (input.tags !== undefined) {
    post.tags = input.tags;
  }
}

function ApplyPublishState(post: BlogPost, input: UpdateBlogPostInput): void {
  if (input.publish === undefined) {
    return;
  }
  post.publishedAt = input.publish ? (post.publishedAt ?? new Date()) : null;
}
