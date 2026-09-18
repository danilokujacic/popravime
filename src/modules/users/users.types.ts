export enum UserRole {
  Customer = 'customer',
  ProviderOwner = 'provider_owner',
  Admin = 'admin',
}

export enum OAuthProvider {
  Google = 'google',
  Facebook = 'facebook',
}

export enum Locale {
  Me = 'me',
  En = 'en',
}

export enum TermsAcceptanceSource {
  Register = 'register',
  AcceptPage = 'accept_page',
}

export interface TermsAcceptanceEvidence {
  version: string;
  documentHash: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  locale?: Locale;
}

export interface UserCredentials {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerified: boolean;
}

export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  fullName: string;
}
