import { CreateUserInput, OAuthProfile, UserRole } from '../users/users.types';
import { LoginInput, PendingConfirmationResult } from './auth.types';
import { TokenPair } from './interfaces/token-pair.interface';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { RefreshTokenSession } from './interfaces/refresh-token-session.interface';

export interface IAuthService {
  Register(input: CreateUserInput): Promise<PendingConfirmationResult>;
  Login(input: LoginInput): Promise<TokenPair>;
  Refresh(user: AuthenticatedUser): Promise<TokenPair>;
  Logout(session: RefreshTokenSession): Promise<void>;
  TryOAuthLogin(profile: OAuthProfile): Promise<TokenPair | null>;
  CompleteOAuthSignup(
    profile: OAuthProfile,
    role: UserRole,
  ): Promise<TokenPair>;
  ConfirmEmail(slug: string): Promise<TokenPair>;
  ResendConfirmation(email: string): Promise<void>;
}
