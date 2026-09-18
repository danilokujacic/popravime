import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';
import { OAuthProvider, UserCredentials } from './users.types';

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

  FindByOAuthIdentity(
    provider: OAuthProvider,
    providerId: string,
  ): Promise<User | null> {
    return this.repository.findOne({
      where: { oauthProvider: provider, oauthId: providerId },
    });
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

    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      emailVerified: user.emailVerified,
    };
  }

  async Create(user: Partial<User>): Promise<User> {
    try {
      const entity = this.repository.create(user);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async Save(user: User): Promise<User> {
    try {
      return await this.repository.save(user);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async TouchActivity(id: string, staleBefore: Date): Promise<void> {
    await this.repository.update(
      { id, lastActiveAt: LessThan(staleBefore) },
      { lastActiveAt: new Date() },
    );
  }
}
