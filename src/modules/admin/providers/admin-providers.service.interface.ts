import { Provider } from '../../providers/entities/provider.entity';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

export interface IAdminProvidersService {
  List(
    approved: boolean | undefined,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Provider>>;
  SetApproval(
    adminId: string,
    providerId: string,
    approved: boolean,
  ): Promise<Provider>;
}
