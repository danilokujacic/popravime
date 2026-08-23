import { PriceEstimate } from './entities/price-estimate.entity';
import {
  CreatePriceEstimateInput,
  ListPriceEstimatesFilter,
  UpdatePriceEstimateInput,
} from './price-estimates.types';

export interface IPriceEstimatesService {
  List(filter: ListPriceEstimatesFilter): Promise<PriceEstimate[]>;
  FindById(id: string): Promise<PriceEstimate>;
  Create(input: CreatePriceEstimateInput): Promise<PriceEstimate>;
  Update(id: string, input: UpdatePriceEstimateInput): Promise<PriceEstimate>;
  Delete(id: string): Promise<void>;
}
