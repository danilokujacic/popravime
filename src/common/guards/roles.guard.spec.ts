import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../modules/users/users.types';
import { AuthenticatedUser } from '../interfaces/authenticated-request.interface';

function BuildContext(user: AuthenticatedUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'ana@popravime.me',
    role: UserRole.ProviderOwner,
  };

  it('allows access when no roles metadata is present', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(BuildContext(user))).toBe(true);
  });

  it('allows access when the user role matches a required role', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.ProviderOwner],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(BuildContext(user))).toBe(true);
  });

  it('denies access when the user role does not match any required role', () => {
    const reflector = {
      getAllAndOverride: () => [UserRole.Admin],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(BuildContext(user))).toBe(false);
  });
});
