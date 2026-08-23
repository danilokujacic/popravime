import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { BlogPost } from './entities/blog-post.entity';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class BlogPostsRepository {
  constructor(
    @InjectRepository(BlogPost)
    private readonly repository: Repository<BlogPost>,
  ) {}

  async ListPublished(
    page: number,
    limit: number,
  ): Promise<PaginatedResult<BlogPost>> {
    const [items, total] = await this.repository.findAndCount({
      where: { publishedAt: LessThanOrEqual(new Date()) },
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  FindById(id: string): Promise<BlogPost | null> {
    return this.repository.findOne({ where: { id } });
  }

  FindBySlug(slug: string): Promise<BlogPost | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async SlugExists(slug: string): Promise<boolean> {
    return this.repository.exists({ where: { slug } });
  }

  async Create(post: Partial<BlogPost>): Promise<BlogPost> {
    try {
      const entity = this.repository.create(post);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(post: BlogPost): Promise<BlogPost> {
    try {
      return await this.repository.save(post);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }
}
