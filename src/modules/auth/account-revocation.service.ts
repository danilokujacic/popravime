import { Injectable } from '@nestjs/common';
import { CacheService } from '../infra/cache/cache.service';

function BuildKey(userId: string): string {
  return `account-revoked:${userId}`;
}

@Injectable()
export class AccountRevocationService {
  constructor(private readonly cacheService: CacheService) {}

  async Revoke(userId: string, ttlSeconds: number): Promise<void> {
    await this.cacheService.Set(BuildKey(userId), true, ttlSeconds);
  }

  async IsRevoked(userId: string): Promise<boolean> {
    const value = await this.cacheService.Get<boolean>(BuildKey(userId));
    return value === true;
  }
}
