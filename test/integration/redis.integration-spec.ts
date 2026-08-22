import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import KeyvRedis, { Keyv } from '@keyv/redis';
import { createCache } from 'cache-manager';
import { Queue, Worker } from 'bullmq';

jest.setTimeout(120000);

describe('Redis integration', () => {
  let container: StartedRedisContainer;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
  });

  afterAll(async () => {
    await container.stop();
  });

  it('CacheService-equivalent GetOrSet only calls the factory once for a cache hit', async () => {
    const cache = createCache({
      stores: [
        new Keyv({ store: new KeyvRedis(container.getConnectionUrl()) }),
      ],
    });
    const factory = jest
      .fn<Promise<string>, []>()
      .mockResolvedValue('provider-list');

    const first = await cache.wrap('integration-test-key', factory, 5000);
    const second = await cache.wrap('integration-test-key', factory, 5000);

    expect(first).toBe('provider-list');
    expect(second).toBe('provider-list');
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('round-trips a BullMQ job through a real Redis connection', async () => {
    interface TestJobData {
      message: string;
    }

    const connection = { host: container.getHost(), port: container.getPort() };
    const queue = new Queue<TestJobData>('integration-test-queue', {
      connection,
    });

    const processed = new Promise<string>((resolve, reject) => {
      const worker = new Worker<TestJobData>(
        'integration-test-queue',
        (job) => {
          resolve(job.data.message);
          return Promise.resolve();
        },
        { connection },
      );
      worker.on('failed', (_job, error) => reject(error));
    });

    await queue.add('test-job', { message: 'hello-from-integration-test' });

    await expect(processed).resolves.toBe('hello-from-integration-test');

    await queue.close();
  });
});
