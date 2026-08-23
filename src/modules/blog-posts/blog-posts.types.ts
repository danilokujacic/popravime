export interface CreateBlogPostInput {
  title: string;
  content: string;
  coverImageUrl?: string;
  tags?: string[];
  publish?: boolean;
}

export interface UpdateBlogPostInput {
  title?: string;
  content?: string;
  coverImageUrl?: string;
  tags?: string[];
  publish?: boolean;
}
