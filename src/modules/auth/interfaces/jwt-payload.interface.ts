import { UserRole } from '../../users/users.types';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  jti: string;
  authTime?: number;
  exp?: number;
}
