import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  GetOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    return this.cache.wrap(key, factory, ttlSeconds * 1000);
  }

  async Set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.cache.set(key, value, ttlSeconds * 1000);
  }

  Get<T>(key: string): Promise<T | undefined> {
    return this.cache.get<T>(key);
  }

  Delete(key: string): Promise<boolean> {
    return this.cache.del(key);
  }
}
