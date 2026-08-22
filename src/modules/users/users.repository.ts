import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { PersistenceErrorMapper } from '../../database/persistence-error.mapper';
import { UserCredentials } from './users.types';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  FindById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  FindByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async FindCredentials(email: string): Promise<UserCredentials | null> {
    const user = await this.repository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      return null;
    }

    return { id: user.id, email: user.email, passwordHash: user.passwordHash, role: user.role };
  }

  async Create(user: Partial<User>): Promise<User> {
    try {
      const entity = this.repository.create(user);
      return await this.repository.save(entity);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(user: User): Promise<User> {
    try {
      return await this.repository.save(user);
    } catch (error) {
      if (error instanceof QueryFailedError) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }
}
