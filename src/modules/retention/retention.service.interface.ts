import { PurgeSummary } from './retention.types';

export interface IRetentionService {
  Purge(): Promise<PurgeSummary>;
}
