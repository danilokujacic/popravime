import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { UsersRepository } from './users.repository';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { User } from './entities/user.entity';
import {
  CreateUserInput,
  OAuthProfile,
  UpdateUserInput,
  UserCredentials,
  UserRole,
} from './users.types';
import { IUsersService } from './users.service.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { legalConfig } from '../../config/legal.config';

const ACTIVITY_RESOLUTION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
    @Inject(legalConfig.KEY)
    private readonly legal: ConfigType<typeof legalConfig>,
  ) {}

  async Register(input: CreateUserInput): Promise<User> {
    const passwordHash = await this.passwordHasher.Hash(input.password);

    return this.usersRepository.Create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      emailVerified: false,
      termsAcceptedAt: new Date(),
      termsVersion: this.legal.termsVersion,
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

  async FindOAuthMatch(profile: OAuthProfile): Promise<User | null> {
    const byIdentity = await this.usersRepository.FindByOAuthIdentity(
      profile.provider,
      profile.providerId,
    );
    if (byIdentity) {
      return byIdentity;
    }

    const byEmail = await this.usersRepository.FindByEmail(profile.email);
    if (!byEmail) {
      return null;
    }
    if (!byEmail.oauthProvider) {
      byEmail.oauthProvider = profile.provider;
      byEmail.oauthId = profile.providerId;
      // Linking a plain-registration account to an OAuth identity re-proves ownership of the
      // same email address, even if the original signup's confirmation link was never clicked.
      byEmail.emailVerified = true;
      return this.usersRepository.Save(byEmail);
    }
    return byEmail;
  }

  async CreateOAuthUser(profile: OAuthProfile, role: UserRole): Promise<User> {
    const passwordHash = await this.passwordHasher.Hash(
      randomBytes(32).toString('hex'),
    );
    return this.usersRepository.Create({
      email: profile.email,
      passwordHash,
      fullName: profile.fullName,
      phone: null,
      role,
      oauthProvider: profile.provider,
      oauthId: profile.providerId,
      // The OAuth provider already proved ownership of this email address — no confirmation
      // link needed.
      emailVerified: true,
      termsAcceptedAt: new Date(),
      termsVersion: this.legal.termsVersion,
    });
  }

  async MarkEmailVerified(email: string): Promise<User> {
    const user = await this.usersRepository.FindByEmail(email);
    if (!user) {
      throw new DomainNotFoundException('USER_NOT_FOUND', 'User not found');
    }
    user.emailVerified = true;
    return this.usersRepository.Save(user);
  }

  async Update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.FindById(id);

    if (input.fullName !== undefined) {
      user.fullName = input.fullName;
    }
    if (input.phone !== undefined) {
      user.phone = input.phone;
    }
    if (input.locale !== undefined) {
      user.locale = input.locale;
    }

    return this.usersRepository.Save(user);
  }

  async AcceptTerms(id: string): Promise<User> {
    const user = await this.FindById(id);
    user.termsAcceptedAt = new Date();
    user.termsVersion = this.legal.termsVersion;
    return this.usersRepository.Save(user);
  }

  async TouchActivity(id: string): Promise<void> {
    await this.usersRepository.TouchActivity(
      id,
      new Date(Date.now() - ACTIVITY_RESOLUTION_MS),
    );
  }
}
