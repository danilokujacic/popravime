import { Inject, Injectable } from '@nestjs/common';
import { Transactional } from 'typeorm-transactional';
import type { ConfigType } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { UsersRepository } from './users.repository';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { User } from './entities/user.entity';
import {
  OAuthProfile,
  TermsAcceptanceSource,
  UpdateUserInput,
  UserCredentials,
  UserRole,
} from './users.types';
import type {
  CreateUserInput,
  TermsAcceptanceEvidence,
} from './users.types';
import { IUsersService } from './users.service.interface';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { legalConfig } from '../../config/legal.config';
import { TermsAcceptanceService } from './terms-acceptance.service';
import { TermsAcceptancesRepository } from './terms-acceptances.repository';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';

const ACTIVITY_RESOLUTION_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class UsersService implements IUsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly termsAcceptancesRepository: TermsAcceptancesRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly termsAcceptanceService: TermsAcceptanceService,
    @Inject(legalConfig.KEY)
    private readonly legal: ConfigType<typeof legalConfig>,
  ) {}

  @Transactional()
  async Register(
    input: CreateUserInput,
    evidence: TermsAcceptanceEvidence,
  ): Promise<User> {
    this.EnsureCurrentTerms(evidence);
    const passwordHash = await this.passwordHasher.Hash(input.password);

    const user = await this.usersRepository.Create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      emailVerified: false,
      termsAcceptedAt: new Date(),
      termsVersion: this.legal.termsVersion,
    });
    await this.RecordAcceptance(
      user.id,
      TermsAcceptanceSource.Register,
      evidence,
    );
    return user;
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

  @Transactional()
  async AcceptTerms(
    id: string,
    evidence: TermsAcceptanceEvidence,
  ): Promise<User> {
    this.EnsureCurrentTerms(evidence);
    const user = await this.FindById(id);
    user.termsAcceptedAt = new Date();
    user.termsVersion = this.legal.termsVersion;
    const saved = await this.usersRepository.Save(user);
    await this.RecordAcceptance(id, TermsAcceptanceSource.AcceptPage, evidence);
    await this.termsAcceptanceService.Invalidate(id);
    return saved;
  }

  async TouchActivity(id: string): Promise<void> {
    await this.usersRepository.TouchActivity(
      id,
      new Date(Date.now() - ACTIVITY_RESOLUTION_MS),
    );
  }

  private EnsureCurrentTerms(evidence: TermsAcceptanceEvidence): void {
    const versionMatches = evidence.version === this.legal.termsVersion;
    const hashMatches =
      this.legal.termsHash === '' ||
      evidence.documentHash === this.legal.termsHash;
    if (!versionMatches || !hashMatches) {
      throw new DomainConflictException(
        'TERMS_VERSION_MISMATCH',
        'The privacy policy and terms shown are out of date; reload the page and try again',
      );
    }
  }

  private async RecordAcceptance(
    userId: string,
    source: TermsAcceptanceSource,
    evidence: TermsAcceptanceEvidence,
  ): Promise<void> {
    await this.termsAcceptancesRepository.Create({
      userId,
      version: this.legal.termsVersion,
      documentHash: this.legal.termsHash || evidence.documentHash,
      source,
      ipAddress: evidence.ipAddress,
      userAgent: evidence.userAgent,
    });
  }
}
