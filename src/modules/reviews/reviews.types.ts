export interface CreateReviewInput {
  requestId: string;
  rating: number;
  comment: string;
}

export interface ListReviewsFilter {
  providerId?: string;
}

export interface OverallReviewStats {
  totalReviews: number;
  averageRating: string | null;
}
