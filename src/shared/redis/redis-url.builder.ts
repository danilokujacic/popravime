import type { RedisConfig } from '../../config/redis.config';

export function BuildRedisUrl(config: RedisConfig): string {
  const auth = config.password ? `:${config.password}@` : '';
  return `redis://${auth}${config.host}:${config.port}`;
}
