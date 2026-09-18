import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { EmailConfirmationsService } from '../email-confirmations/email-confirmations.service';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { jwtConfig } from '../../config/jwt.config';
import { appConfig } from '../../config/app.config';
import {
  CreateUserInput,
  OAuthProfile,
  TermsAcceptanceEvidence,
  UserRole,
} from '../users/users.types';
import { LoginInput, PendingConfirmationResult } from './auth.types';
import { TokenPair } from './interfaces/token-pair.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RefreshTokenSession } from './interfaces/refresh-token-session.interface';
import { IAuthService } from './auth.service.interface';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainUnauthorizedException } from '../../common/exceptions/unauthorized.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';
import { EmailQueueService } from '../infra/email/email-queue.service';
import { RefreshTokenDenylistService } from './refresh-token-denylist.service';
import { CORRELATION_ID_CLS_KEY } from '../../common/constants/correlation.constants';

function NowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailConfirmationsService: EmailConfirmationsService,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
    private readonly emailQueueService: EmailQueueService,
    private readonly refreshTokenDenylistService: RefreshTokenDenylistService,
    private readonly cls: ClsService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    @Inject(appConfig.KEY)
    private readonly app: ConfigType<typeof appConfig>,
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
  ) {}

  // No tokens back — a plain registration starts unverified (§ emailVerified) and can't log in
  // yet, so there's no session to hand over until the confirmation link is clicked. OAuth signup
  // (CompleteOAuthSignup below) is unaffected: the provider already proved the email, so that
  // path still logs in immediately.
  async Register(
    input: CreateUserInput,
    evidence: TermsAcceptanceEvidence,
  ): Promise<PendingConfirmationResult> {
    const existing = await this.usersService.FindByEmail(input.email);
    if (existing) {
      this.logger.warn(
        { existingUserId: existing.id },
        'Registration attempted with existing email',
      );
      throw new DomainConflictException(
        'EMAIL_TAKEN',
        'Email is already registered',
      );
    }

    const user = await this.usersService.Register(input, evidence);
    this.logger.info({ userId: user.id, role: user.role }, 'User registered');

    await this.SendConfirmationEmail(user);

    return { email: user.email };
  }

  async Login(input: LoginInput): Promise<TokenPair> {
    const credentials = await this.usersService.FindCredentials(input.email);
    if (!credentials) {
      this.logger.warn('Login attempted for unknown email');
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

    if (!credentials.emailVerified) {
      this.logger.warn(
        { userId: credentials.id },
        'Login rejected: email not verified',
      );
      throw new DomainForbiddenException(
        'EMAIL_NOT_VERIFIED',
        'Confirm your email before logging in',
      );
    }

    this.logger.info({ userId: credentials.id }, 'User logged in');

    return this.IssueTokens(
      credentials.id,
      credentials.email,
      credentials.role,
      NowSeconds(),
    );
  }

  // The FE page at /confirm-email/:slug posts the slug straight here — a fresh session comes
  // back so the customer/provider lands on their dashboard immediately rather than having to
  // separately log in right after confirming.
  async ConfirmEmail(slug: string): Promise<TokenPair> {
    const email = await this.emailConfirmationsService.Confirm(slug);
    const user = await this.usersService.MarkEmailVerified(email);
    this.logger.info({ userId: user.id }, 'Email confirmed');
    return this.IssueTokens(user.id, user.email, user.role, NowSeconds());
  }

  async ResendConfirmation(email: string): Promise<void> {
    const user = await this.usersService.FindByEmail(email);
    if (!user) {
      this.logger.warn(
        { email },
        'Confirmation resend requested for unknown email',
      );
      throw new DomainNotFoundException(
        'USER_NOT_FOUND',
        'No account with that email',
      );
    }
    if (user.emailVerified) {
      this.logger.warn(
        { userId: user.id },
        'Confirmation resend requested for an already-verified email',
      );
      throw new DomainConflictException(
        'EMAIL_ALREADY_VERIFIED',
        'This email is already confirmed',
      );
    }

    await this.SendConfirmationEmail(user);
    this.logger.info({ userId: user.id }, 'Confirmation email resent');
  }

  private async SendConfirmationEmail(user: User): Promise<void> {
    const { slug } = await this.emailConfirmationsService.Create(user.email);
    const confirmUrl = `${this.app.frontendUrl}/confirm-email/${slug}`;

    await this.emailQueueService.Enqueue({
      kind: 'email-confirmation',
      payload: {
        to: user.email,
        fullName: user.fullName,
        locale: user.locale,
        confirmUrl,
      },
      correlationId:
        this.cls.get<string>(CORRELATION_ID_CLS_KEY) ?? randomUUID(),
    });
  }

  Refresh(user: AuthenticatedUser): Promise<TokenPair> {
    this.logger.info({ userId: user.id }, 'Access token refreshed');
    return this.IssueTokens(user.id, user.email, user.role, user.authTime);
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
    return this.IssueTokens(user.id, user.email, user.role, NowSeconds());
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
    return this.IssueTokens(user.id, user.email, user.role, NowSeconds());
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
    authTime: number | undefined,
  ): Promise<TokenPair> {
    await this.usersService.TouchActivity(userId);

    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      jti: randomUUID(),
      ...(authTime === undefined ? {} : { authTime }),
    };

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
