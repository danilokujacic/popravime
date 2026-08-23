import { BlogPost } from '../entities/blog-post.entity';
import { BlogPostResponseDto } from '../dto/blog-post-response.dto';

export class BlogPostResponseMapper {
  static ToDto(this: void, post: BlogPost): BlogPostResponseDto {
    const dto = new BlogPostResponseDto();
    dto.id = post.id;
    dto.authorId = post.authorId;
    dto.title = post.title;
    dto.slug = post.slug;
    dto.content = post.content;
    dto.coverImageUrl = post.coverImageUrl;
    dto.tags = post.tags;
    dto.publishedAt = post.publishedAt;
    dto.createdAt = post.createdAt;
    dto.updatedAt = post.updatedAt;
    return dto;
  }
}
