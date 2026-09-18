import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IRecentAuthenticationService } from './recent-authentication.service.interface';
import { jwtConfig } from '../../config/jwt.config';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { DomainForbiddenException } from '../../common/exceptions/forbidden.exception';

@Injectable()
export class RecentAuthenticationService implements IRecentAuthenticationService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    @InjectPinoLogger(RecentAuthenticationService.name)
    private readonly logger: PinoLogger,
  ) {}

  Ensure(user: AuthenticatedUser): void {
    if (this.IsRecent(user.authTime)) {
      return;
    }

    this.logger.warn({ userId: user.id }, 'Recent login required');
    throw new DomainForbiddenException(
      'REAUTH_REQUIRED',
      'Log in again to confirm it is you',
    );
  }

  private IsRecent(authTime: number | undefined): boolean {
    if (authTime === undefined) {
      return false;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    return nowSeconds - authTime <= this.config.reauthWindowSeconds;
  }
}
