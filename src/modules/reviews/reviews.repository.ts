import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class ReviewsRepository {
  constructor(
    @InjectRepository(Review)
    private readonly repository: Repository<Review>,
  ) {}

  async ListPublishedForProvider(
    providerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Review>> {
    const [items, total] = await this.repository.findAndCount({
      where: { providerId, isPublished: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  FindById(id: string): Promise<Review | null> {
    return this.repository.findOne({ where: { id } });
  }

  ExistsForRequest(requestId: string): Promise<boolean> {
    return this.repository.exists({ where: { requestId } });
  }

  async ListRatingsForProvider(providerId: string): Promise<number[]> {
    const reviews = await this.repository.find({
      where: { providerId },
      select: { rating: true },
    });
    return reviews.map((review) => review.rating);
  }

  async Create(review: Partial<Review>): Promise<Review> {
    try {
      const entity = this.repository.create(review);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(review: Review): Promise<Review> {
    try {
      return await this.repository.save(review);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async OverallStats(): Promise<{
    totalReviews: number;
    averageRating: string | null;
  }> {
    const totalReviews = await this.repository.count();
    if (totalReviews === 0) {
      return { totalReviews: 0, averageRating: null };
    }

    const result = await this.repository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .getRawOne<{ average: string }>();

    return {
      totalReviews,
      averageRating: result ? Number(result.average).toFixed(2) : null,
    };
  }
}
