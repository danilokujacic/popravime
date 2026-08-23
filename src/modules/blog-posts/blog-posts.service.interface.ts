import { BlogPost } from './entities/blog-post.entity';
import { CreateBlogPostInput, UpdateBlogPostInput } from './blog-posts.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IBlogPostsService {
  Create(authorId: string, input: CreateBlogPostInput): Promise<BlogPost>;
  Update(id: string, input: UpdateBlogPostInput): Promise<BlogPost>;
  FindPublishedBySlug(slug: string): Promise<BlogPost>;
  FindById(id: string): Promise<BlogPost>;
  ListPublished(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BlogPost>>;
}
