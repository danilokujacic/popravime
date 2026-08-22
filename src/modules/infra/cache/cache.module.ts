import { Global, Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import type { ConfigType } from '@nestjs/config';
import { redisConfig } from '../../../config/redis.config';
import { BuildRedisUrl } from '../../../shared/redis/redis-url.builder';
import { CacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [redisConfig.KEY],
      useFactory: (config: ConfigType<typeof redisConfig>) => ({
        stores: new KeyvRedis(BuildRedisUrl(config)),
      }),
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheInfraModule {}
