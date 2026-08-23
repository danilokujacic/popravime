export interface CreatePriceEstimateInput {
  categoryId: string;
  serviceType: string;
  priceMin: string;
  priceMax: string;
  currency?: string;
}

export interface UpdatePriceEstimateInput {
  serviceType?: string;
  priceMin?: string;
  priceMax?: string;
  currency?: string;
}

export interface ListPriceEstimatesFilter {
  categoryId?: string;
}
