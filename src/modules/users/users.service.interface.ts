import { User } from './entities/user.entity';
import {
  CreateUserInput,
  OAuthProfile,
  TermsAcceptanceEvidence,
  UpdateUserInput,
  UserCredentials,
  UserRole,
} from './users.types';

export interface IUsersService {
  Register(
    input: CreateUserInput,
    evidence: TermsAcceptanceEvidence,
  ): Promise<User>;
  FindById(id: string): Promise<User>;
  FindByEmail(email: string): Promise<User | null>;
  FindCredentials(email: string): Promise<UserCredentials | null>;
  FindOAuthMatch(profile: OAuthProfile): Promise<User | null>;
  CreateOAuthUser(profile: OAuthProfile, role: UserRole): Promise<User>;
  Update(id: string, input: UpdateUserInput): Promise<User>;
  MarkEmailVerified(email: string): Promise<User>;
  AcceptTerms(id: string, evidence: TermsAcceptanceEvidence): Promise<User>;
  TouchActivity(id: string): Promise<void>;
}
