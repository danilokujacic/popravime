import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { ConfigType } from '@nestjs/config';
import { jwtConfig } from '../../../config/jwt.config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-request.interface';
import { AccountRevocationService } from '../account-revocation.service';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    @Inject(jwtConfig.KEY)
    config: ConfigType<typeof jwtConfig>,
    private readonly accountRevocationService: AccountRevocationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const isRevoked = await this.accountRevocationService.IsRevoked(
      payload.sub,
    );
    if (isRevoked) {
      throw new UnauthorizedException('Account no longer exists');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      authTime: payload.authTime,
    };
  }
}
