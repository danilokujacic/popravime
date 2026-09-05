import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { OAuthProvider, UserRole } from '../users/users.types';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainUnauthorizedException } from '../../common/exceptions/unauthorized.exception';

function BuildService(overrides?: {
  usersService?: Partial<UsersService>;
  passwordHasher?: Partial<PasswordHasher>;
  refreshTokenDenylistService?: Record<string, jest.Mock>;
}) {
  const usersService = {
    FindByEmail: jest.fn().mockResolvedValue(null),
    Register: jest.fn(),
    FindCredentials: jest.fn(),
    FindOAuthMatch: jest.fn(),
    CreateOAuthUser: jest.fn(),
    ...overrides?.usersService,
  } as unknown as UsersService;

  const passwordHasher = {
    Verify: jest.fn(),
    ...overrides?.passwordHasher,
  } as unknown as PasswordHasher;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
  } as unknown as ConstructorParameters<typeof AuthService>[2];

  const emailQueueService = {
    Enqueue: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConstructorParameters<typeof AuthService>[3];

  const refreshTokenDenylistService = {
    Revoke: jest.fn().mockResolvedValue(undefined),
    IsRevoked: jest.fn().mockResolvedValue(false),
    ...overrides?.refreshTokenDenylistService,
  } as unknown as ConstructorParameters<typeof AuthService>[4];

  const config = {
    accessSecret: 'access-secret',
    accessExpiresInSeconds: 900,
    refreshSecret: 'refresh-secret',
    refreshExpiresInSeconds: 604800,
  };

  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
  } as unknown as ConstructorParameters<typeof AuthService>[6];

  const service = new AuthService(
    usersService,
    passwordHasher,
    jwtService,
    emailQueueService,
    refreshTokenDenylistService,
    config,
    logger,
  );

  return {
    service,
    usersService,
    passwordHasher,
    refreshTokenDenylistService,
  };
}

describe('AuthService', () => {
  describe('Register', () => {
    it('rejects registration when the email is already taken', async () => {
      const { service, usersService } = BuildService({
        usersService: {
          FindByEmail: jest.fn().mockResolvedValue({ id: 'existing-user' }),
        },
      });

      await expect(
        service.Register({
          email: 'ana@popravime.me',
          password: 'password123',
          fullName: 'Ana Petrović',
          role: UserRole.Customer,
        }),
      ).rejects.toBeInstanceOf(DomainConflictException);

      expect(usersService.Register).not.toHaveBeenCalled();
    });

    it('issues a token pair when registration succeeds', async () => {
      const { service, usersService } = BuildService({
        usersService: {
          Register: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            fullName: 'Ana Petrović',
            role: UserRole.Customer,
          }),
        },
      });

      const result = await service.Register({
        email: 'ana@popravime.me',
        password: 'password123',
        fullName: 'Ana Petrović',
        role: UserRole.Customer,
      });

      expect(usersService.Register).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: 'signed-token',
        refreshToken: 'signed-token',
      });
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

    it('issues a token pair when credentials are valid', async () => {
      const { service } = BuildService({
        usersService: {
          FindCredentials: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'ana@popravime.me',
            passwordHash: 'hashed',
            role: UserRole.Customer,
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
