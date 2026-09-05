import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersService } from '../users/users.service';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { jwtConfig } from '../../config/jwt.config';
import { CreateUserInput, OAuthProfile, UserRole } from '../users/users.types';
import { LoginInput } from './auth.types';
import { TokenPair } from './interfaces/token-pair.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenSession } from './interfaces/refresh-token-session.interface';
import { IAuthService } from './auth.service.interface';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainUnauthorizedException } from '../../common/exceptions/unauthorized.exception';
import { EmailQueueService } from '../infra/email/email-queue.service';
import { RefreshTokenDenylistService } from './refresh-token-denylist.service';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
    private readonly emailQueueService: EmailQueueService,
    private readonly refreshTokenDenylistService: RefreshTokenDenylistService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  async Register(input: CreateUserInput): Promise<TokenPair> {
    const existing = await this.usersService.FindByEmail(input.email);
    if (existing) {
      this.logger.warn(
        { email: input.email },
        'Registration attempted with existing email',
      );
      throw new DomainConflictException(
        'EMAIL_TAKEN',
        'Email is already registered',
      );
    }

    const user = await this.usersService.Register(input);
    this.logger.info({ userId: user.id, role: user.role }, 'User registered');

    await this.emailQueueService.Enqueue({
      kind: 'welcome',
      payload: { to: user.email, fullName: user.fullName },
    });

    return this.IssueTokens(user.id, user.email, user.role);
  }

  async Login(input: LoginInput): Promise<TokenPair> {
    const credentials = await this.usersService.FindCredentials(input.email);
    if (!credentials) {
      this.logger.warn(
        { email: input.email },
        'Login attempted for unknown email',
      );
      throw new DomainUnauthorizedException(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    const passwordMatches = await this.passwordHasher.Verify(
      input.password,
      credentials.passwordHash,
    );
    if (!passwordMatches) {
      this.logger.warn(
        { userId: credentials.id },
        'Login attempted with invalid password',
      );
      throw new DomainUnauthorizedException(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
      );
    }

    this.logger.info({ userId: credentials.id }, 'User logged in');

    return this.IssueTokens(
      credentials.id,
      credentials.email,
      credentials.role,
    );
  }

  Refresh(user: AuthenticatedUser): Promise<TokenPair> {
    this.logger.info({ userId: user.id }, 'Access token refreshed');
    return this.IssueTokens(user.id, user.email, user.role);
  }

  async TryOAuthLogin(profile: OAuthProfile): Promise<TokenPair | null> {
    const user = await this.usersService.FindOAuthMatch(profile);
    if (!user) {
      return null;
    }
    this.logger.info(
      { userId: user.id, provider: profile.provider },
      'User logged in via OAuth',
    );
    return this.IssueTokens(user.id, user.email, user.role);
  }

  async CompleteOAuthSignup(
    profile: OAuthProfile,
    role: UserRole,
  ): Promise<TokenPair> {
    const existing = await this.usersService.FindOAuthMatch(profile);
    const user =
      existing ?? (await this.usersService.CreateOAuthUser(profile, role));
    this.logger.info(
      { userId: user.id, provider: profile.provider, role: user.role },
      existing ? 'User logged in via OAuth' : 'User signed up via OAuth',
    );
    return this.IssueTokens(user.id, user.email, user.role);
  }

  async Logout(session: RefreshTokenSession): Promise<void> {
    const ttlSeconds = Math.max(
      1,
      Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000),
    );
    await this.refreshTokenDenylistService.Revoke(session.jti, ttlSeconds);
    this.logger.info({ userId: session.id }, 'User logged out');
  }

  private async IssueTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role, jti: randomUUID() };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.accessSecret,
        expiresIn: this.config.accessExpiresInSeconds,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.refreshSecret,
        expiresIn: this.config.refreshExpiresInSeconds,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
