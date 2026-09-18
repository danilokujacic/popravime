import { Request } from 'express';
import { UserRole } from '../../modules/users/users.types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  authTime?: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
