import { Injectable } from '@nestjs/common';
import { CacheService } from '../infra/cache/cache.service';

function BuildKey(jti: string): string {
  return `refresh-denylist:${jti}`;
}

@Injectable()
export class RefreshTokenDenylistService {
  constructor(private readonly cacheService: CacheService) {}

  async Revoke(jti: string, ttlSeconds: number): Promise<void> {
    await this.cacheService.Set(BuildKey(jti), true, ttlSeconds);
  }

  async IsRevoked(jti: string): Promise<boolean> {
    const value = await this.cacheService.Get<boolean>(BuildKey(jti));
    return value === true;
  }
}
