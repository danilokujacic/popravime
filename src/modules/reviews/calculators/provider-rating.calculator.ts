export interface ProviderRatingResult {
  averageRating: string | null;
  reviewCount: number;
}

export class ProviderRatingCalculator {
  static Compute(ratings: number[]): ProviderRatingResult {
    if (ratings.length === 0) {
      return { averageRating: null, reviewCount: 0 };
    }

    const sum = ratings.reduce((total, rating) => total + rating, 0);
    const average = sum / ratings.length;

    return { averageRating: average.toFixed(2), reviewCount: ratings.length };
  }
}
