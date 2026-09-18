import { AccountExport } from './account-data.types';

export interface IAccountExportService {
  Export(userId: string): Promise<AccountExport>;
}
