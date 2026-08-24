import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenStrategy } from './refresh-token.strategy';
import { RefreshTokenDenylistService } from '../refresh-token-denylist.service';
import { UserRole } from '../../users/users.types';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

function BuildPayload(overrides?: Partial<JwtPayload>): JwtPayload {
  return {
    sub: 'user-1',
    email: 'ana@popravime.me',
    role: UserRole.Customer,
    jti: 'jti-1',
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

describe('RefreshTokenStrategy.validate', () => {
  function BuildStrategy(isRevoked: boolean) {
    const refreshTokenDenylistService = {
      IsRevoked: jest.fn().mockResolvedValue(isRevoked),
      Revoke: jest.fn(),
    } as unknown as RefreshTokenDenylistService;

    const strategy = new RefreshTokenStrategy(
      {
        accessSecret: 'access-secret',
        accessExpiresInSeconds: 900,
        refreshSecret: 'refresh-secret',
        refreshExpiresInSeconds: 604800,
      },
      refreshTokenDenylistService,
    );

    return { strategy };
  }

  it('returns a session for a non-revoked token', async () => {
    const { strategy } = BuildStrategy(false);

    const session = await strategy.validate(BuildPayload());

    expect(session).toEqual(
      expect.objectContaining({ id: 'user-1', jti: 'jti-1' }),
    );
  });

  it('rejects a revoked token', async () => {
    const { strategy } = BuildStrategy(true);

    await expect(strategy.validate(BuildPayload())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token with no expiration', async () => {
    const { strategy } = BuildStrategy(false);

    await expect(
      strategy.validate(BuildPayload({ exp: undefined })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
