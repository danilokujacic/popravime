import { Provider } from './entities/provider.entity';
import {
  CreateProviderInput,
  ListProvidersFilter,
  UpdateProviderInput,
  UpdateRatingStatsInput,
  UpdateVerificationStatusInput,
  VerificationStatus,
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
  GetForUser(userId: string): Promise<Provider>;
  FindById(id: string): Promise<Provider>;
  FindBySlug(slug: string): Promise<Provider>;
  List(
    filter: ListProvidersFilter,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Provider>>;
  UpdateRatingStats(
    providerId: string,
    stats: UpdateRatingStatsInput,
  ): Promise<Provider>;
  UpdateVerificationStatus(
    providerId: string,
    input: UpdateVerificationStatusInput,
  ): Promise<Provider>;
  CountByVerificationStatus(): Promise<Record<VerificationStatus, number>>;
  FindCategoryIdsForOwner(ownerUserId: string): Promise<string[]>;
  ListEligibleForCategory(categoryId: string): Promise<Provider[]>;
}
