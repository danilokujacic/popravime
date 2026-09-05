import { CreateUserInput, OAuthProfile, UserRole } from '../users/users.types';
import { LoginInput } from './auth.types';
import { TokenPair } from './interfaces/token-pair.interface';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { RefreshTokenSession } from './interfaces/refresh-token-session.interface';

export interface IAuthService {
  Register(input: CreateUserInput): Promise<TokenPair>;
  Login(input: LoginInput): Promise<TokenPair>;
  Refresh(user: AuthenticatedUser): Promise<TokenPair>;
  Logout(session: RefreshTokenSession): Promise<void>;
  TryOAuthLogin(profile: OAuthProfile): Promise<TokenPair | null>;
  CompleteOAuthSignup(
    profile: OAuthProfile,
    role: UserRole,
  ): Promise<TokenPair>;
}
