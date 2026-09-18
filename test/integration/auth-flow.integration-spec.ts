import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { DataSource } from 'typeorm';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { BuildDataSourceOptions } from '../../src/database/data-source-options';
import { AppModule } from '../../src/app.module';
import { AUTH_THROTTLE } from '../../src/modules/infra/rate-limit/rate-limit.constants';

jest.setTimeout(180000);

interface TokenPairBody {
  access_token: string;
  refresh_token: string;
}

interface MeBody {
  email: string;
}

describe('Auth flow integration', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedRedisContainer;
  let app: INestApplication<App>;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:16-alpine').start();
    redis = await new RedisContainer('redis:7-alpine').start();

    process.env.DATABASE_HOST = postgres.getHost();
    process.env.DATABASE_PORT = String(postgres.getPort());
    process.env.DATABASE_USER = postgres.getUsername();
    process.env.DATABASE_PASSWORD = postgres.getPassword();
    process.env.DATABASE_NAME = postgres.getDatabase();
    process.env.REDIS_HOST = redis.getHost();
    process.env.REDIS_PORT = String(redis.getPort());
    process.env.JWT_SECRET = 'integration-test-access-secret';
    process.env.REFRESH_SECRET = 'integration-test-refresh-secret';
    process.env.STORAGE_ENDPOINT = 'http://localhost:9000';
    process.env.STORAGE_BUCKET = 'integration-test';
    process.env.STORAGE_PRIVATE_BUCKET = 'integration-test-private';
    process.env.STORAGE_ACCESS_KEY = 'integration-test';
    process.env.STORAGE_SECRET_KEY = 'integration-test';
    process.env.STORAGE_PUBLIC_URL = 'http://localhost:9000/integration-test';
    process.env.EMAIL_HOST = 'localhost';
    process.env.EMAIL_PORT = '1025';
    process.env.GEOCODING_USER_AGENT = 'popravime-integration-test/1.0';

    const migrationDataSource = new DataSource(
      BuildDataSourceOptions({
        host: postgres.getHost(),
        port: postgres.getPort(),
        username: postgres.getUsername(),
        password: postgres.getPassword(),
        database: postgres.getDatabase(),
      }),
    );
    await migrationDataSource.initialize();
    await migrationDataSource.runMigrations({ transaction: 'each' });
    await migrationDataSource.destroy();

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await postgres.stop();
    await redis.stop();
  });

  it('registers, logs in, hits a protected route, and refreshes the access token', async () => {
    const server = app.getHttpServer();

    const registerResponse = await request(server)
      .post('/auth/register')
      .send({
        email: 'flow@popravime.me',
        password: 'password123',
        repeat_password: 'password123',
        full_name: 'Flow Tester',
        role: 'customer',
      })
      .expect(201);
    const registerBody: TokenPairBody = registerResponse.body;

    expect(registerBody.access_token).toBeDefined();
    expect(registerBody.refresh_token).toBeDefined();

    const loginResponse = await request(server)
      .post('/auth/login')
      .send({ email: 'flow@popravime.me', password: 'password123' })
      .expect(200);
    const loginBody: TokenPairBody = loginResponse.body;

    const meResponse = await request(server)
      .get('/users/me')
      .set('Authorization', `Bearer ${loginBody.access_token}`)
      .expect(200);
    const meBody: MeBody = meResponse.body;

    expect(meBody.email).toBe('flow@popravime.me');

    const refreshResponse = await request(server)
      .post('/auth/refresh')
      .send({ refresh_token: loginBody.refresh_token })
      .expect(200);
    const refreshBody: TokenPairBody = refreshResponse.body;

    expect(refreshBody.access_token).toBeDefined();
  });

  it('rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('throttles repeated login attempts using the real Redis-backed storage', async () => {
    const server = app.getHttpServer();
    const attempt = () =>
      request(server)
        .post('/auth/login')
        .send({ email: 'flow@popravime.me', password: 'wrong-password' });

    const limit = AUTH_THROTTLE.default.limit;
    for (let index = 0; index < limit; index += 1) {
      await attempt();
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
  });
});
