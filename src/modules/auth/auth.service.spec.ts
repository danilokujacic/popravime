import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { UserRole } from '../users/users.types';
import { DomainConflictException } from '../../common/exceptions/conflict.exception';
import { DomainUnauthorizedException } from '../../common/exceptions/unauthorized.exception';

function BuildService(overrides?: {
  usersService?: Partial<UsersService>;
  passwordHasher?: Partial<PasswordHasher>;
}) {
  const usersService = {
    FindByEmail: jest.fn().mockResolvedValue(null),
    Register: jest.fn(),
    FindCredentials: jest.fn(),
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

  const config = {
    accessSecret: 'access-secret',
    accessExpiresInSeconds: 900,
    refreshSecret: 'refresh-secret',
    refreshExpiresInSeconds: 604800,
  };

  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
  } as unknown as ConstructorParameters<typeof AuthService>[5];

  const service = new AuthService(
    usersService,
    passwordHasher,
    jwtService,
    emailQueueService,
    config,
    logger,
  );

  return { service, usersService, passwordHasher };
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
});
