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
import { SeedCities } from '../../src/database/seeds/cities.seed';
import { SeedCategories } from '../../src/database/seeds/categories.seed';
import { PasswordHasher } from '../../src/shared/password/password-hasher';
import { GEOCODING_SERVICE } from '../../src/common/constants/di-tokens';
import type { IGeocodingService } from '../../src/modules/providers/geocoding/geocoding.service.interface';

jest.setTimeout(180000);

interface TokenPairBody {
  access_token: string;
}

interface RepairRequestBody {
  id: string;
  status: string;
  accepted_offer_id: string | null;
}

interface OfferBody {
  id: string;
  status: string;
}

interface ProviderBody {
  id: string;
}

interface PaginatedBody<T> {
  items: T[];
}

const ADMIN_EMAIL = 'admin@popravime.me';
const ADMIN_PASSWORD = 'admin-password-1';

describe('Repair request main flow', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedRedisContainer;
  let app: INestApplication<App>;
  let cityId: string;
  let customerToken: string;
  let mobileProviderToken: string;
  let mobileProviderId: string;
  let plumbingProviderToken: string;
  let plumbingProviderId: string;
  let secondMobileProviderToken: string;
  let secondMobileProviderId: string;
  let pendingProviderToken: string;
  let pendingProviderId: string;
  let mobileCategoryId: string;

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
    process.env.STORAGE_ACCESS_KEY = 'integration-test';
    process.env.STORAGE_SECRET_KEY = 'integration-test';
    process.env.STORAGE_PUBLIC_URL = 'http://localhost:9000/integration-test';
    process.env.EMAIL_HOST = 'localhost';
    process.env.EMAIL_PORT = '1025';
    process.env.GEOCODING_USER_AGENT = 'popravime-integration-test/1.0';

    const dataSourceOptions = BuildDataSourceOptions({
      host: postgres.getHost(),
      port: postgres.getPort(),
      username: postgres.getUsername(),
      password: postgres.getPassword(),
      database: postgres.getDatabase(),
    });
    const migrationDataSource = new DataSource(dataSourceOptions);
    await migrationDataSource.initialize();
    await migrationDataSource.runMigrations({ transaction: 'each' });

    await SeedCities(migrationDataSource);
    await SeedCategories(migrationDataSource);

    const passwordHasher = new PasswordHasher({ saltRounds: 4 });
    const adminPasswordHash = await passwordHasher.Hash(ADMIN_PASSWORD);
    await migrationDataSource.query(
      `INSERT INTO "users" ("email", "password_hash", "full_name", "role")
       VALUES ($1, $2, $3, 'admin')`,
      [ADMIN_EMAIL, adminPasswordHash, 'Admin'],
    );

    const [mobileCategory]: { id: string }[] = await migrationDataSource.query(
      `SELECT id FROM categories WHERE name = 'Mobile phones'`,
    );
    const [plumbingCategory]: { id: string }[] =
      await migrationDataSource.query(
        `SELECT id FROM categories WHERE name = 'Plumbing'`,
      );
    const [city]: { id: string }[] = await migrationDataSource.query(
      `SELECT id FROM cities WHERE name = 'Podgorica'`,
    );
    mobileCategoryId = mobileCategory.id;
    const plumbingCategoryId = plumbingCategory.id;
    cityId = city.id;

    await migrationDataSource.destroy();

    const geocodingStub: IGeocodingService = {
      Geocode: () =>
        Promise.resolve({ latitude: '42.4304', longitude: '19.2594' }),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GEOCODING_SERVICE)
      .useValue(geocodingStub)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    customerToken = await Register('customer@popravime-flow.me', 'customer');
    mobileProviderToken = await Register(
      'mobile-provider@popravime-flow.me',
      'provider_owner',
    );
    plumbingProviderToken = await Register(
      'plumbing-provider@popravime-flow.me',
      'provider_owner',
    );
    secondMobileProviderToken = await Register(
      'mobile-provider-2@popravime-flow.me',
      'provider_owner',
    );
    pendingProviderToken = await Register(
      'pending-provider@popravime-flow.me',
      'provider_owner',
    );

    mobileProviderId = await CreateProvider(
      mobileProviderToken,
      [mobileCategoryId],
      'Mobile Fix Podgorica',
    );
    plumbingProviderId = await CreateProvider(
      plumbingProviderToken,
      [plumbingCategoryId],
      'Plumbing Pro Podgorica',
    );
    secondMobileProviderId = await CreateProvider(
      secondMobileProviderToken,
      [mobileCategoryId],
      'Mobile Fix Two',
    );
    // Every other test in this suite exercises behavior that requires a `verified`
    // provider (offers, repair-request visibility) — mark these baseline fixtures
    // verified so those tests aren't incidentally blocked by the new verification gate.
    // `pendingProviderId` is deliberately left at its default `pending` status to cover
    // that gate itself.
    pendingProviderId = await CreateProvider(
      pendingProviderToken,
      [mobileCategoryId],
      'Still Pending Repair',
    );
    await VerifyProviders([
      mobileProviderId,
      plumbingProviderId,
      secondMobileProviderId,
    ]);
  });

  afterAll(async () => {
    await app.close();
    await postgres.stop();
    await redis.stop();
  });

  async function Register(
    email: string,
    role: 'customer' | 'provider_owner',
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'password123',
        repeat_password: 'password123',
        full_name: 'Integration Tester',
        role,
      })
      .expect(201);
    const body: TokenPairBody = response.body;
    return body.access_token;
  }

  async function LoginAdmin(): Promise<string> {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    const body: TokenPairBody = login.body;
    return body.access_token;
  }

  async function CreateProvider(
    token: string,
    categoryIds: string[],
    businessName: string,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/providers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        business_name: businessName,
        address: 'Bulevar Svetog Petra Cetinjskog 1',
        city_id: cityId,
        category_ids: categoryIds,
      })
      .expect(201);
    const body: ProviderBody = response.body;
    return body.id;
  }

  async function VerifyProviders(providerIds: string[]): Promise<void> {
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `UPDATE providers SET verification_status = 'verified' WHERE id = ANY($1)`,
      [providerIds],
    );
  }

  async function CreateRepairRequest(categoryId: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/repair-requests')
      .set('Authorization', `Bearer ${customerToken}`)
      .field('category_id', categoryId)
      .field('description', 'The screen is cracked and unresponsive')
      .field('city_id', cityId)
      .field('urgency', 'standard')
      .expect(201);
    const body: RepairRequestBody = response.body;
    return body.id;
  }

  async function ApproveRepairRequest(
    adminToken: string,
    requestId: string,
  ): Promise<void> {
    await request(app.getHttpServer())
      .patch(`/repair-requests/${requestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
  }

  async function CreateOffer(
    token: string,
    requestId: string,
    providerId: string,
  ): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        request_id: requestId,
        provider_id: providerId,
        price_min: '3000',
        price_max: '6000',
        estimated_duration: '2 days',
        parts_type: 'original',
      })
      .expect(201);
    const body: OfferBody = response.body;
    return body.id;
  }

  it('walks a repair request from creation through offer acceptance', async () => {
    const adminToken = await LoginAdmin();
    const requestId = await CreateRepairRequest(mobileCategoryId);
    await ApproveRepairRequest(adminToken, requestId);

    const offerId = await CreateOffer(
      mobileProviderToken,
      requestId,
      mobileProviderId,
    );

    const acceptResponse = await request(app.getHttpServer())
      .patch(`/offers/${offerId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'accepted' })
      .expect(200);
    const acceptedOffer: OfferBody = acceptResponse.body;
    expect(acceptedOffer.status).toBe('accepted');

    const finalRequest = await request(app.getHttpServer())
      .get(`/repair-requests/${requestId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const finalRequestBody: RepairRequestBody = finalRequest.body;
    expect(finalRequestBody.status).toBe('accepted');
    expect(finalRequestBody.accepted_offer_id).toBe(offerId);
  });

  it('only lets a provider list and view repair requests in their own serviced categories', async () => {
    const adminToken = await LoginAdmin();
    const requestId = await CreateRepairRequest(mobileCategoryId);
    await ApproveRepairRequest(adminToken, requestId);

    const mobileProviderList = await request(app.getHttpServer())
      .get('/repair-requests')
      .set('Authorization', `Bearer ${mobileProviderToken}`)
      .expect(200);
    const mobileProviderListBody: PaginatedBody<RepairRequestBody> =
      mobileProviderList.body;
    expect(
      mobileProviderListBody.items.some((item) => item.id === requestId),
    ).toBe(true);

    const plumbingProviderList = await request(app.getHttpServer())
      .get('/repair-requests')
      .set('Authorization', `Bearer ${plumbingProviderToken}`)
      .expect(200);
    const plumbingProviderListBody: PaginatedBody<RepairRequestBody> =
      plumbingProviderList.body;
    expect(
      plumbingProviderListBody.items.some((item) => item.id === requestId),
    ).toBe(false);

    await request(app.getHttpServer())
      .get(`/repair-requests/${requestId}`)
      .set('Authorization', `Bearer ${plumbingProviderToken}`)
      .expect(403);
  });

  it('denies a provider owner whose provider is not verified from seeing or offering on repair requests', async () => {
    const adminToken = await LoginAdmin();
    const requestId = await CreateRepairRequest(mobileCategoryId);
    await ApproveRepairRequest(adminToken, requestId);

    const pendingProviderList = await request(app.getHttpServer())
      .get('/repair-requests')
      .set('Authorization', `Bearer ${pendingProviderToken}`)
      .expect(200);
    const pendingProviderListBody: PaginatedBody<RepairRequestBody> =
      pendingProviderList.body;
    expect(
      pendingProviderListBody.items.some((item) => item.id === requestId),
    ).toBe(false);

    await request(app.getHttpServer())
      .get(`/repair-requests/${requestId}`)
      .set('Authorization', `Bearer ${pendingProviderToken}`)
      .expect(403);

    const offerResponse = await request(app.getHttpServer())
      .post('/offers')
      .set('Authorization', `Bearer ${pendingProviderToken}`)
      .send({
        request_id: requestId,
        provider_id: pendingProviderId,
        price_min: '3000',
        price_max: '6000',
        estimated_duration: '2 days',
        parts_type: 'original',
      })
      .expect(403);
    const offerErrorBody: { error: { code: string } } = offerResponse.body;
    expect(offerErrorBody.error.code).toBe('PROVIDER_NOT_VERIFIED');
  });

  it('accepts exactly one offer when two acceptances race on the same request', async () => {
    const adminToken = await LoginAdmin();
    const requestId = await CreateRepairRequest(mobileCategoryId);
    await ApproveRepairRequest(adminToken, requestId);

    const offerAId = await CreateOffer(
      mobileProviderToken,
      requestId,
      mobileProviderId,
    );
    const offerBId = await CreateOffer(
      secondMobileProviderToken,
      requestId,
      secondMobileProviderId,
    );

    const [responseA, responseB] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/offers/${offerAId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'accepted' }),
      request(app.getHttpServer())
        .patch(`/offers/${offerBId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'accepted' }),
    ]);

    const statuses = [responseA.status, responseB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const finalRequest = await request(app.getHttpServer())
      .get(`/repair-requests/${requestId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const finalRequestBody: RepairRequestBody = finalRequest.body;
    expect([offerAId, offerBId]).toContain(finalRequestBody.accepted_offer_id);
  });
});
