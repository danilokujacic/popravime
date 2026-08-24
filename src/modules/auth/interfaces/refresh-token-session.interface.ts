import { AuthenticatedUser } from '../../../common/interfaces/authenticated-request.interface';

export interface RefreshTokenSession extends AuthenticatedUser {
  jti: string;
  expiresAt: Date;
}
