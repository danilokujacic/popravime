import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { ConfigType } from '@nestjs/config';
import { jwtConfig } from '../../../config/jwt.config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RefreshTokenSession } from '../interfaces/refresh-token-session.interface';
import { RefreshTokenDenylistService } from '../refresh-token-denylist.service';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    @Inject(jwtConfig.KEY)
    config: ConfigType<typeof jwtConfig>,
    private readonly refreshTokenDenylistService: RefreshTokenDenylistService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
      ignoreExpiration: false,
      secretOrKey: config.refreshSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<RefreshTokenSession> {
    const isRevoked = await this.refreshTokenDenylistService.IsRevoked(
      payload.jti,
    );
    if (isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      jti: payload.jti,
      expiresAt: this.ExtractExpiry(payload),
    };
  }

  private ExtractExpiry(payload: JwtPayload): Date {
    if (payload.exp === undefined) {
      throw new UnauthorizedException('Refresh token is missing an expiration');
    }
    return new Date(payload.exp * 1000);
  }
}
