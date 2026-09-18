import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { UsersRepository } from './users.repository';
import { ITermsAcceptanceService } from './terms-acceptance.service.interface';
import { CacheService } from '../infra/cache/cache.service';
import { legalConfig } from '../../config/legal.config';

const NO_VERSION = '';

function BuildKey(userId: string): string {
  return `terms-version:${userId}`;
}

@Injectable()
export class TermsAcceptanceService implements ITermsAcceptanceService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly cacheService: CacheService,
    @Inject(legalConfig.KEY)
    private readonly legal: ConfigType<typeof legalConfig>,
  ) {}

  async HasAccepted(userId: string): Promise<boolean> {
    const acceptedVersion = await this.LoadVersion(userId);
    return acceptedVersion === this.legal.termsVersion;
  }

  async Invalidate(userId: string): Promise<void> {
    await this.cacheService.Delete(BuildKey(userId));
  }

  private async LoadVersion(userId: string): Promise<string> {
    const cached = await this.cacheService.Get<string>(BuildKey(userId));
    if (cached !== undefined) {
      return cached;
    }

    const user = await this.usersRepository.FindById(userId);
    const version = user?.termsVersion ?? NO_VERSION;
    await this.cacheService.Set(
      BuildKey(userId),
      version,
      this.legal.termsCacheTtlSeconds,
    );
    return version;
  }
}
