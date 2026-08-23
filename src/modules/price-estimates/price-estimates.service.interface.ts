import { PriceEstimate } from './entities/price-estimate.entity';
import {
  CreatePriceEstimateInput,
  ListPriceEstimatesFilter,
  UpdatePriceEstimateInput,
} from './price-estimates.types';

export interface IPriceEstimatesService {
  List(filter: ListPriceEstimatesFilter): Promise<PriceEstimate[]>;
  FindById(id: string): Promise<PriceEstimate>;
  Create(
    adminId: string,
    input: CreatePriceEstimateInput,
  ): Promise<PriceEstimate>;
  Update(
    id: string,
    adminId: string,
    input: UpdatePriceEstimateInput,
  ): Promise<PriceEstimate>;
  Delete(id: string, adminId: string): Promise<void>;
}
