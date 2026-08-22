import { CreateUserInput } from '../users/users.types';
import { LoginInput } from './auth.types';
import { TokenPair } from './interfaces/token-pair.interface';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

export interface IAuthService {
  Register(input: CreateUserInput): Promise<TokenPair>;
  Login(input: LoginInput): Promise<TokenPair>;
  Refresh(user: AuthenticatedUser): Promise<TokenPair>;
}
