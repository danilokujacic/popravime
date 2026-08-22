import { User } from './entities/user.entity';
import { CreateUserInput, UpdateUserInput, UserCredentials } from './users.types';

export interface IUsersService {
  Register(input: CreateUserInput): Promise<User>;
  FindById(id: string): Promise<User>;
  FindByEmail(email: string): Promise<User | null>;
  FindCredentials(email: string): Promise<UserCredentials | null>;
  Update(id: string, input: UpdateUserInput): Promise<User>;
}
