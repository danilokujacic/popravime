import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { CacheService } from '../infra/cache/cache.service';
import { oauthConfig } from '../../config/oauth.config';
import { TokenPair } from './interfaces/token-pair.interface';
import { OAuthProfile } from '../users/users.types';
import { DomainUnauthorizedException } from '../../common/exceptions/unauthorized.exception';

const EXCHANGE_KEY_PREFIX = 'oauth-exchange';
const PENDING_SIGNUP_KEY_PREFIX = 'oauth-pending-signup';
const NEEDS_ROLE_PARAM = 'needs_role';

function BuildKey(prefix: string, code: string): string {
  return `${prefix}:${code}`;
}

@Injectable()
export class OAuthExchangeService {
  constructor(
    private readonly cacheService: CacheService,
    @Inject(oauthConfig.KEY)
    private readonly config: ConfigType<typeof oauthConfig>,
  ) {}

  async CreateTokenCode(tokens: TokenPair): Promise<string> {
    const code = randomUUID();
    await this.cacheService.Set(
      BuildKey(EXCHANGE_KEY_PREFIX, code),
      tokens,
      this.config.exchangeCodeTtlSeconds,
    );
    return code;
  }

  async ConsumeTokenCode(code: string): Promise<TokenPair> {
    const key = BuildKey(EXCHANGE_KEY_PREFIX, code);
    const tokens = await this.cacheService.Get<TokenPair>(key);
    if (!tokens) {
      throw new DomainUnauthorizedException(
        'OAUTH_CODE_INVALID',
        'This sign-in link has expired or already been used',
      );
    }
    await this.cacheService.Delete(key);
    return tokens;
  }

  async CreateProfileCode(profile: OAuthProfile): Promise<string> {
    const code = randomUUID();
    await this.cacheService.Set(
      BuildKey(PENDING_SIGNUP_KEY_PREFIX, code),
      profile,
      this.config.exchangeCodeTtlSeconds,
    );
    return code;
  }

  async ConsumeProfileCode(code: string): Promise<OAuthProfile> {
    const key = BuildKey(PENDING_SIGNUP_KEY_PREFIX, code);
    const profile = await this.cacheService.Get<OAuthProfile>(key);
    if (!profile) {
      throw new DomainUnauthorizedException(
        'OAUTH_CODE_INVALID',
        'This sign-up link has expired or already been used',
      );
    }
    await this.cacheService.Delete(key);
    return profile;
  }

  BuildTokenRedirectUrl(code: string): string {
    const url = new URL(this.config.frontendRedirectUrl);
    url.searchParams.set('code', code);
    return url.toString();
  }

  BuildRoleSelectionRedirectUrl(code: string): string {
    const url = new URL(this.config.frontendRedirectUrl);
    url.searchParams.set('code', code);
    url.searchParams.set(NEEDS_ROLE_PARAM, '1');
    return url.toString();
  }
}
