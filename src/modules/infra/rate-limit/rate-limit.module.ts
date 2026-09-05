import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import { redisConfig } from '../../../config/redis.config';
import { throttleConfig } from '../../../config/throttle.config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [redisConfig.KEY, throttleConfig.KEY],
      useFactory: (
        redis: ConfigType<typeof redisConfig>,
        throttle: ConfigType<typeof throttleConfig>,
      ) => ({
        throttlers: [
          {
            name: 'default',
            limit: throttle.defaultLimit,
            ttl: throttle.defaultTtlMs,
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: redis.host,
            port: redis.port,
            password: redis.password,
            connectTimeout: 5000,
            maxRetriesPerRequest: 1,
          }),
        ),
      }),
    }),
  ],
})
export class RateLimitModule {}
