import { UserRole } from '../users.types';

export class UserResponseDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}
