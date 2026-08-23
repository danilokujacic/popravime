export class BlogPostResponseDto {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  content: string;
  coverImageUrl: string | null;
  tags: string[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
