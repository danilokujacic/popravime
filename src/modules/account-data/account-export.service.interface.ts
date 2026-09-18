import { AccountExport } from './account-data.types';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

export interface IAccountExportService {
  Export(user: AuthenticatedUser): Promise<AccountExport>;
}
