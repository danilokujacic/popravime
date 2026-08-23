import { Review } from './entities/review.entity';
import { CreateReviewInput, OverallReviewStats } from './reviews.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IReviewsService {
  Create(customerId: string, input: CreateReviewInput): Promise<Review>;
  RespondTo(
    reviewId: string,
    providerOwnerId: string,
    response: string,
  ): Promise<Review>;
  FindById(id: string): Promise<Review>;
  ListForProvider(
    providerId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Review>>;
  OverallStats(): Promise<OverallReviewStats>;
}
