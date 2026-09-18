import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

export interface IAccountErasureService {
  Erase(user: AuthenticatedUser): Promise<void>;
  EraseInactive(userId: string): Promise<boolean>;
}
