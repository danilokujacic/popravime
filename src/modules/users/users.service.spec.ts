import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { User } from './entities/user.entity';
import { OAuthProfile, OAuthProvider, UserRole } from './users.types';

function BuildProfile(overrides?: Partial<OAuthProfile>): OAuthProfile {
  return {
    provider: OAuthProvider.Google,
    providerId: 'google-123',
    email: 'ana@example.com',
    fullName: 'Ana Petrović',
    ...overrides,
  };
}

function BuildUser(overrides?: Partial<User>): User {
  return {
    id: 'user-1',
    email: 'ana@example.com',
    fullName: 'Ana Petrović',
    role: UserRole.Customer,
    oauthProvider: null,
    oauthId: null,
    ...overrides,
  } as User;
}

function BuildService(overrides?: {
  usersRepository?: Partial<Record<keyof UsersRepository, jest.Mock>>;
}) {
  const usersRepository = {
    FindByOAuthIdentity: jest.fn().mockResolvedValue(null),
    FindByEmail: jest.fn().mockResolvedValue(null),
    Save: jest.fn().mockImplementation((user: User) => user),
    FindById: jest.fn().mockResolvedValue(BuildUser()),
    TouchActivity: jest.fn().mockResolvedValue(undefined),
    Create: jest
      .fn()
      .mockImplementation(
        (user: Partial<User>) => ({ id: 'new-user', ...user }) as User,
      ),
    ...overrides?.usersRepository,
  } as unknown as UsersRepository;

  const passwordHasher = {
    Hash: jest.fn().mockResolvedValue('random-hash'),
  } as unknown as PasswordHasher;

  const service = new UsersService(usersRepository, passwordHasher, {
    termsVersion: '2026-09-18',
  });

  return { service, usersRepository, passwordHasher };
}

describe('UsersService.FindOAuthMatch', () => {
  it('returns the existing user when the oauth identity is already linked', async () => {
    const linkedUser = BuildUser({
      oauthProvider: OAuthProvider.Google,
      oauthId: 'google-123',
    });
    const { service, usersRepository } = BuildService({
      usersRepository: {
        FindByOAuthIdentity: jest.fn().mockResolvedValue(linkedUser),
      },
    });

    const result = await service.FindOAuthMatch(BuildProfile());

    expect(result).toBe(linkedUser);
    expect(usersRepository.FindByEmail).not.toHaveBeenCalled();
  });

  it('links the oauth identity to an existing email/password account with no identity yet', async () => {
    const existingUser = BuildUser({ oauthProvider: null, oauthId: null });
    const { service, usersRepository } = BuildService({
      usersRepository: {
        FindByEmail: jest.fn().mockResolvedValue(existingUser),
      },
    });

    const result = await service.FindOAuthMatch(BuildProfile());

    expect(usersRepository.Save).toHaveBeenCalledWith(
      expect.objectContaining({
        oauthProvider: OAuthProvider.Google,
        oauthId: 'google-123',
      }),
    );
    expect(result?.oauthProvider).toBe(OAuthProvider.Google);
  });

  it('logs in as the matching email account without overwriting a different linked provider', async () => {
    const existingUser = BuildUser({
      oauthProvider: OAuthProvider.Facebook,
      oauthId: 'facebook-999',
    });
    const { service, usersRepository } = BuildService({
      usersRepository: {
        FindByEmail: jest.fn().mockResolvedValue(existingUser),
      },
    });

    const result = await service.FindOAuthMatch(BuildProfile());

    expect(usersRepository.Save).not.toHaveBeenCalled();
    expect(result).toBe(existingUser);
  });

  it('returns null when no identity or email matches', async () => {
    const { service, usersRepository } = BuildService();

    const result = await service.FindOAuthMatch(BuildProfile());

    expect(usersRepository.Create).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});

describe('UsersService.CreateOAuthUser', () => {
  it('creates an account with the given role and links the oauth identity', async () => {
    const { service, usersRepository, passwordHasher } = BuildService();

    const result = await service.CreateOAuthUser(
      BuildProfile(),
      UserRole.ProviderOwner,
    );

    expect(passwordHasher.Hash).toHaveBeenCalled();
    expect(usersRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@example.com',
        fullName: 'Ana Petrović',
        role: UserRole.ProviderOwner,
        oauthProvider: OAuthProvider.Google,
        oauthId: 'google-123',
      }),
    );
    expect(result.email).toBe('ana@example.com');
  });
});

describe('UsersService terms and activity', () => {
  it('stamps the current terms version when a user registers', async () => {
    const { service, usersRepository } = BuildService();

    await service.Register({
      email: 'ana@example.com',
      password: 'password123',
      fullName: 'Ana Petrović',
      role: UserRole.Customer,
    });

    expect(usersRepository.Create).toHaveBeenCalledWith(
      expect.objectContaining({
        termsVersion: '2026-09-18',
        termsAcceptedAt: expect.any(Date) as Date,
      }),
    );
  });

  it('records acceptance of the current terms version', async () => {
    const { service, usersRepository } = BuildService({
      usersRepository: {
        FindById: jest
          .fn()
          .mockResolvedValue(BuildUser({ termsVersion: null })),
      },
    });

    const user = await service.AcceptTerms('user-1');

    expect(user.termsVersion).toBe('2026-09-18');
    expect(user.termsAcceptedAt).toBeInstanceOf(Date);
    expect(usersRepository.Save).toHaveBeenCalled();
  });

  it('only refreshes the activity timestamp when it is older than a day', async () => {
    const { service, usersRepository } = BuildService();
    const before = Date.now();

    await service.TouchActivity('user-1');

    const [id, staleBefore] = (usersRepository.TouchActivity as jest.Mock).mock
      .calls[0] as [string, Date];
    expect(id).toBe('user-1');
    expect(before - staleBefore.getTime()).toBeGreaterThanOrEqual(
      24 * 60 * 60 * 1000 - 5,
    );
  });
});
