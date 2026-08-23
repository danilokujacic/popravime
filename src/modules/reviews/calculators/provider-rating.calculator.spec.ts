import { ProviderRatingCalculator } from './provider-rating.calculator';

describe('ProviderRatingCalculator', () => {
  it('returns null average and zero count for no ratings', () => {
    expect(ProviderRatingCalculator.Compute([])).toEqual({
      averageRating: null,
      reviewCount: 0,
    });
  });

  it('returns the rating itself for a single review', () => {
    expect(ProviderRatingCalculator.Compute([4])).toEqual({
      averageRating: '4.00',
      reviewCount: 1,
    });
  });

  it('averages multiple ratings and rounds to 2 decimals', () => {
    expect(ProviderRatingCalculator.Compute([5, 4, 4])).toEqual({
      averageRating: '4.33',
      reviewCount: 3,
    });
  });

  it('rounds a repeating decimal correctly', () => {
    expect(ProviderRatingCalculator.Compute([5, 5, 4])).toEqual({
      averageRating: '4.67',
      reviewCount: 3,
    });
  });
});
