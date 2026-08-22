import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { User } from './entities/user.entity';
import { CreateUserInput, UpdateUserInput, UserCredentials } from './users.types';
import { IUsersService } from './users.service.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async Register(input: CreateUserInput): Promise<User> {
    const passwordHash = await this.passwordHasher.Hash(input.password);

    return this.usersRepository.Create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
    });
  }

  async FindById(id: string): Promise<User> {
    const user = await this.usersRepository.FindById(id);
    if (!user) {
      throw new DomainNotFoundException('USER_NOT_FOUND', 'User not found');
    }
    return user;
  }

  FindByEmail(email: string): Promise<User | null> {
    return this.usersRepository.FindByEmail(email);
  }

  FindCredentials(email: string): Promise<UserCredentials | null> {
    return this.usersRepository.FindCredentials(email);
  }

  async Update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.FindById(id);

    if (input.fullName !== undefined) {
      user.fullName = input.fullName;
    }
    if (input.phone !== undefined) {
      user.phone = input.phone;
    }

    return this.usersRepository.Save(user);
  }
}
