export enum UserRole {
  Customer = 'customer',
  ProviderOwner = 'provider_owner',
  Admin = 'admin',
}

export enum OAuthProvider {
  Google = 'google',
  Facebook = 'facebook',
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
}

export interface UserCredentials {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  fullName: string;
}
