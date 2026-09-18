import { Locale, UserRole } from '../users.types';

export class UserResponseDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  locale: Locale;
  termsAccepted: boolean;
  requiredTermsVersion: string;
  createdAt: Date;
}
