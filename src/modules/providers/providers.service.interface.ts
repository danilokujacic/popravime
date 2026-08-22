import { Provider } from './entities/provider.entity';
import {
  CreateProviderInput,
  ListProvidersFilter,
  UpdateProviderInput,
} from './providers.types';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

export interface IProvidersService {
  Create(ownerUserId: string, input: CreateProviderInput): Promise<Provider>;
  Update(
    id: string,
    ownerUserId: string,
    input: UpdateProviderInput,
  ): Promise<Provider>;
  Delete(id: string, ownerUserId: string): Promise<void>;
  FindById(id: string): Promise<Provider>;
  FindBySlug(slug: string): Promise<Provider>;
  List(
    filter: ListProvidersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Provider>>;
}
