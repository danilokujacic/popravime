import type { ClsService } from 'nestjs-cls';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailCooldownService } from '../infra/email/email-cooldown.service';
import { EmailConfirmationsService } from '../email-confirmations/email-confirmations.service';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { OAuthProvider, UserRole } from '../users/users.types';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainUnauthorizedException } from '../../common/exceptions/unauthorized.exception';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import { DomainNotFoundException } from '../../common/exceptions/not-found.exception';

function BuildService(overrides?: {
  usersService?: Partial<UsersService>;
  emailConfirmationsService?: Partial<EmailConfirmationsService>;
  passwordHasher?: Partial<PasswordHasher>;
  refreshTokenDenylistService?: Record<string, jest.Mock>;
}) {
  const usersService = {
    FindByEmail: jest.fn().mockResolvedValue(null),
    Register: jest.fn(),
    FindCredentials: jest.fn(),
    FindOAuthMatch: jest.fn(),
    CreateOAuthUser: jest.fn(),
    MarkEmailVerified: jest.fn(),
    TouchActivity: jest.fn().mockResolvedValue(undefined),
    ...overrides?.usersService,
  } as unknown as UsersService;

  const emailConfirmationsService = {
    Create: jest
      .fn()
      .mockResolvedValue({ slug: 'a-slug', expiresAt: new Date() }),
    Confirm: jest.fn(),
    ...overrides?.emailConfirmationsService,
  } as unknown as EmailConfirmationsService;

  const passwordHasher = {
    Verify: jest.fn(),
    ...overrides?.passwordHasher,
  } as unknown as PasswordHasher;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  } as unknown as ConstructorParameters<typeof AuthService>[3];

  const emailQueueService = {
    Enqueue: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConstructorParameters<typeof AuthService>[4];

  const emailCooldownService = {
    ShouldSendConfirmation: jest.fn().mockResolvedValue(true),
  } as unknown as EmailCooldownService;

  const refreshTokenDenylistService = {
    Revoke: jest.fn().mockResolvedValue(undefined),
    IsRevoked: jest.fn().mockResolvedValue(false),
    ...overrides?.refreshTokenDenylistService,
  } as unknown as ConstructorParameters<typeof AuthService>[6];

  const config = {
    accessSecret: 'access-secret',
    accessExpiresInSeconds: 900,
    refreshSecret: 'refresh-secret',
    refreshExpiresInSeconds: 604800,
    reauthWindowSeconds: 600,
  };

  const cls = {
    get: jest.fn().mockReturnValue('correlation-1'),
  } as unknown as ClsService;

  const app = {
    frontendUrl: 'http://localhost:3000',
  } as unknown as ConstructorParameters<typeof AuthService>[9];

  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
  } as unknown as ConstructorParameters<typeof AuthService>[10];

  const service = new AuthService(
    usersService,
    emailConfirmationsService,
    passwordHasher,
    jwtService,
    emailQueueService,
    emailCooldownService,
    refreshTokenDenylistService,
    cls,
    config,
    app,
    logger,
  );

  return {
    service,
    usersService,
    emailConfirmationsService,
    passwordHasher,
    emailQueueService,
    emailCooldownService,
    refreshTokenDenylistService,
    jwtService,
    logger,
  };
}

const EVIDENCE = {
  version: '2026-09-18',
  documentHash: 'a'.repeat(64),
  ipAddress: '203.0.113.7',
  userAgent: 'test-agent',
};

describe('AuthService', () => {
  describe('Register', () => {
    it('rejects registration when the email is already taken', async () => {
      const { service, usersService } = BuildService({
        usersService: {
          FindByEmail: jest.fn().mockResolvedValue({ id: 'existing-user' }),
        },
      });

      await expect(
        service.Register(
          {
            email: 'ana@popravime.me',
            password: 'password123',
            fullName: 'Ana Petrović',
            role: UserRole.Customer,
          },
          EVIDENCE,
        ),
      ).rejects.toBeInstanceOf(DomainConflictException);

      expect(usersService.Register).not.toHaveBeenCalled();
    });

    it('creates an unverified account and emails a confirmation link instead of logging in', async () => {
      const {
        service,
        usersService,
        emailConfirmationsService,
        emailQueueService,
      } = BuildService({
        usersService: {
          Register: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            fullName: 'Ana Petrović',
            role: UserRole.Customer,
          }),
        },
      });

      const result = await service.Register(
        {
          email: 'ana@popravime.me',
          password: 'password123',
          fullName: 'Ana Petrović',
          role: UserRole.Customer,
        },
        EVIDENCE,
      );

      expect(usersService.Register).toHaveBeenCalled();
      expect(emailConfirmationsService.Create).toHaveBeenCalledWith(
        'ana@popravime.me',
      );
      expect(emailQueueService.Enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'email-confirmation',
          payload: expect.objectContaining({
            to: 'ana@popravime.me',
            confirmUrl: 'http://localhost:3000/confirm-email/a-slug',
          }),
        }),
      );
      expect(result).toEqual({ email: 'ana@popravime.me' });
    });
  });

  describe('Login', () => {
    it('rejects login for an unknown email', async () => {
      const { service } = BuildService({
        usersService: { FindCredentials: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.Login({
          email: 'unknown@popravime.me',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(DomainUnauthorizedException);
    });

    it('rejects login when the password does not match', async () => {
      const { service } = BuildService({
        usersService: {
          FindCredentials: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            passwordHash: 'hashed',
            role: UserRole.Customer,
            emailVerified: true,
          }),
        },
        passwordHasher: { Verify: jest.fn().mockResolvedValue(false) },
      });

      await expect(
        service.Login({
          email: 'ana@popravime.me',
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(DomainUnauthorizedException);
    });

    it('rejects login for a correct password on an unverified email', async () => {
      const { service } = BuildService({
        usersService: {
          FindCredentials: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            passwordHash: 'hashed',
            role: UserRole.Customer,
            emailVerified: false,
          }),
        },
        passwordHasher: { Verify: jest.fn().mockResolvedValue(true) },
      });

      await expect(
        service.Login({
          email: 'ana@popravime.me',
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(DomainForbiddenException);
    });

    it('issues a token pair when credentials are valid and the email is verified', async () => {
      const { service, usersService } = BuildService({
        usersService: {
          FindCredentials: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            passwordHash: 'hashed',
            role: UserRole.Customer,
            emailVerified: true,
          }),
        },
        passwordHasher: { Verify: jest.fn().mockResolvedValue(true) },
      });

      const result = await service.Login({
        email: 'ana@popravime.me',
        password: 'password123',
      });

      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
      expect(usersService.TouchActivity).toHaveBeenCalledWith('user-1');
    });

    it('stamps the moment of a real login into the tokens', async () => {
      const { service, jwtService } = BuildService({
        usersService: {
          FindCredentials: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            passwordHash: 'hashed',
            role: UserRole.Customer,
            emailVerified: true,
          }),
        },
        passwordHasher: { Verify: jest.fn().mockResolvedValue(true) },
      });
      const before = Math.floor(Date.now() / 1000);

      await service.Login({
        email: 'ana@popravime.me',
        password: 'password123',
      });

      const payload = (jwtService.signAsync as jest.Mock).mock.calls[0][0] as {
        authTime?: number;
      };
      expect(payload.authTime).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Refresh', () => {
    it('keeps the original login time instead of restamping it', async () => {
      const { service, jwtService } = BuildService();

      await service.Refresh({
        id: 'user-1',
        email: 'ana@popravime.me',
        role: UserRole.Customer,
        authTime: 1700000000,
      });

      const payload = (jwtService.signAsync as jest.Mock).mock.calls[0][0] as {
        authTime?: number;
      };
      expect(payload.authTime).toBe(1700000000);
    });

    it('leaves the login time unset when the old token had none', async () => {
      const { service, jwtService } = BuildService();

      await service.Refresh({
        id: 'user-1',
        email: 'ana@popravime.me',
        role: UserRole.Customer,
      });

      const payload = (jwtService.signAsync as jest.Mock).mock.calls[0][0] as {
        authTime?: number;
      };
      expect(payload.authTime).toBeUndefined();
    });
  });

  describe('ConfirmEmail', () => {
    it('marks the email verified and issues a token pair', async () => {
      const { service, usersService, emailConfirmationsService } = BuildService(
        {
          emailConfirmationsService: {
            Confirm: jest.fn().mockResolvedValue('ana@popravime.me'),
          },
          usersService: {
            MarkEmailVerified: jest.fn().mockResolvedValue({
              id: 'user-1',
              email: 'ana@popravime.me',
              role: UserRole.Customer,
            }),
          },
        },
      );

      const result = await service.ConfirmEmail('a-slug');

      expect(emailConfirmationsService.Confirm).toHaveBeenCalledWith('a-slug');
      expect(usersService.MarkEmailVerified).toHaveBeenCalledWith(
        'ana@popravime.me',
      );
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });
  });

  describe('ResendConfirmation', () => {
    it('does nothing, and reveals nothing, for an unknown email', async () => {
      const { service, emailQueueService, logger } = BuildService({
        usersService: { FindByEmail: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.ResendConfirmation('unknown@popravime.me'),
      ).resolves.toBeUndefined();

      expect(emailQueueService.Enqueue).not.toHaveBeenCalled();
      expect(
        JSON.stringify((logger.info as jest.Mock).mock.calls),
      ).not.toContain('unknown@popravime.me');
    });

    it('does nothing for an already-verified email', async () => {
      const { service, emailQueueService } = BuildService({
        usersService: {
          FindByEmail: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            fullName: 'Ana Petrović',
            emailVerified: true,
          }),
        },
      });

      await expect(
        service.ResendConfirmation('ana@popravime.me'),
      ).resolves.toBeUndefined();

      expect(emailQueueService.Enqueue).not.toHaveBeenCalled();
    });

    it('sends a fresh confirmation link for an unverified account', async () => {
      const { service, emailConfirmationsService, emailQueueService } =
        BuildService({
          usersService: {
            FindByEmail: jest.fn().mockResolvedValue({
              id: 'user-1',
              email: 'ana@popravime.me',
              fullName: 'Ana Petrović',
              emailVerified: false,
            }),
          },
        });

      await service.ResendConfirmation('ana@popravime.me');

      expect(emailConfirmationsService.Create).toHaveBeenCalledWith(
        'ana@popravime.me',
      );
      expect(emailQueueService.Enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'email-confirmation' }),
      );
    });

    it('stops sending once the per-address limit is reached, without touching the existing link', async () => {
      const {
        service,
        emailConfirmationsService,
        emailQueueService,
        emailCooldownService,
      } = BuildService({
        usersService: {
          FindByEmail: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            fullName: 'Ana Petrović',
            emailVerified: false,
          }),
        },
      });
      (
        emailCooldownService.ShouldSendConfirmation as jest.Mock
      ).mockResolvedValue(false);

      await service.ResendConfirmation('ana@popravime.me');

      expect(emailConfirmationsService.Create).not.toHaveBeenCalled();
      expect(emailQueueService.Enqueue).not.toHaveBeenCalled();
    });
  });

  describe('TryOAuthLogin', () => {
    const profile = {
      provider: OAuthProvider.Google,
      providerId: 'google-123',
      email: 'ana@popravime.me',
      fullName: 'Ana Petrović',
    };

    it('issues a token pair for a matched user', async () => {
      const { service, usersService } = BuildService({
        usersService: {
          FindOAuthMatch: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            role: UserRole.Customer,
          }),
        },
      });

      const result = await service.TryOAuthLogin(profile);

      expect(usersService.FindOAuthMatch).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });

    it('returns null when no account matches, without creating one', async () => {
      const { service, usersService } = BuildService({
        usersService: { FindOAuthMatch: jest.fn().mockResolvedValue(null) },
      });

      const result = await service.TryOAuthLogin(profile);

      expect(usersService.CreateOAuthUser).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('CompleteOAuthSignup', () => {
    const profile = {
      provider: OAuthProvider.Google,
      providerId: 'google-123',
      email: 'ana@popravime.me',
      fullName: 'Ana Petrović',
    };

    it('creates the account with the chosen role when nothing matches yet', async () => {
      const { service, usersService } = BuildService({
        usersService: {
          FindOAuthMatch: jest.fn().mockResolvedValue(null),
          CreateOAuthUser: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            role: UserRole.ProviderOwner,
          }),
        },
      });

      const result = await service.CompleteOAuthSignup(
        profile,
        UserRole.ProviderOwner,
      );

      expect(usersService.CreateOAuthUser).toHaveBeenCalledWith(
        profile,
        UserRole.ProviderOwner,
      );
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
    });

    it('logs into an account that matched in the meantime instead of creating a duplicate', async () => {
      const { service, usersService } = BuildService({
        usersService: {
          FindOAuthMatch: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            role: UserRole.Customer,
          }),
        },
      });

      await service.CompleteOAuthSignup(profile, UserRole.ProviderOwner);

      expect(usersService.CreateOAuthUser).not.toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    it('revokes the refresh token for its remaining lifetime', async () => {
      const { service, refreshTokenDenylistService } = BuildService();

      const expiresAt = new Date(Date.now() + 60_000);
      await service.Logout({
        id: 'user-1',
        email: 'ana@popravime.me',
        role: UserRole.Customer,
        jti: 'jti-1',
        expiresAt,
      });

      expect(refreshTokenDenylistService.Revoke).toHaveBeenCalledWith(
        'jti-1',
        expect.any(Number),
      );
    });
  });
});
