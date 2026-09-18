import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

export interface IRecentAuthenticationService {
  Ensure(user: AuthenticatedUser): void;
}
