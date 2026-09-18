import { RecentAuthenticationService } from './recent-authentication.service';
import { UserRole } from '../users/users.types';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

function BuildService() {
  const logger = {
    warn: jest.fn(),
  } as unknown as ConstructorParameters<typeof RecentAuthenticationService>[1];

  return new RecentAuthenticationService(
    {
      accessSecret: 'a',
      accessExpiresInSeconds: 900,
      refreshSecret: 'r',
      refreshExpiresInSeconds: 604800,
      reauthWindowSeconds: 600,
    },
    logger,
  );
}

function BuildUser(authTime?: number): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'ana@example.com',
    role: UserRole.Customer,
    authTime,
  };
}

const NOW_SECONDS = () => Math.floor(Date.now() / 1000);

describe('RecentAuthenticationService.Ensure', () => {
  it('accepts a login inside the window', () => {
    expect(() =>
      BuildService().Ensure(BuildUser(NOW_SECONDS() - 120)),
    ).not.toThrow();
  });

  it('rejects a login older than the window', () => {
    expect(() =>
      BuildService().Ensure(BuildUser(NOW_SECONDS() - 3600)),
    ).toThrow(DomainForbiddenException);
  });

  it('rejects a token that carries no login time', () => {
    expect(() => BuildService().Ensure(BuildUser(undefined))).toThrow(
      DomainForbiddenException,
    );
  });
});
