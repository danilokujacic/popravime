import { PriceEstimate } from '../entities/price-estimate.entity';
import { PriceEstimateResponseDto } from '../dto/price-estimate-response.dto';

export class PriceEstimateResponseMapper {
  static ToDto(this: void, estimate: PriceEstimate): PriceEstimateResponseDto {
    const dto = new PriceEstimateResponseDto();
    dto.id = estimate.id;
    dto.categoryId = estimate.categoryId;
    dto.serviceType = estimate.serviceType;
    dto.priceMin = estimate.priceMin;
    dto.priceMax = estimate.priceMax;
    dto.currency = estimate.currency;
    return dto;
  }
}
