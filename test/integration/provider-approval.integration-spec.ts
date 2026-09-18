import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { BuildDataSourceOptions } from '../../src/database/data-source-options';
import { Provider } from '../../src/modules/providers/entities/provider.entity';
import { Category } from '../../src/modules/categories/entities/category.entity';
import { ProviderRepository } from '../../src/modules/providers/repositories/provider.repository';
import { CategoriesRepository } from '../../src/modules/categories/categories.repository';
import { VerificationStatus } from '../../src/modules/providers/providers.types';

jest.setTimeout(180000);

interface IdRow {
  id: string;
}

describe('Provider approval integration', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repository: ProviderRepository;
  let categoryId: string;
  let approvedId: string;
  let waitingId: string;

  async function InsertRow(statement: string, parameters: unknown[]) {
    const rows = await dataSource.query<IdRow[]>(statement, parameters);
    return rows[0].id;
  }

  async function InsertProvider(
    slug: string,
    approved: boolean,
    cityId: string,
  ): Promise<string> {
    const ownerId = await InsertRow(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, 'h', $2, 'provider_owner') RETURNING id`,
      [`${slug}@example.com`, `Owner ${slug}`],
    );
    const providerId = await InsertRow(
      `INSERT INTO providers (owner_user_id, business_name, slug, address, city_id, approved)
       VALUES ($1, $2, $3, 'Street 1', $4, $5) RETURNING id`,
      [ownerId, `Shop ${slug}`, slug, cityId, approved],
    );
    await dataSource.query(
      `INSERT INTO provider_categories (provider_id, category_id) VALUES ($1, $2)`,
      [providerId, categoryId],
    );
    return providerId;
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    dataSource = new DataSource(
      BuildDataSourceOptions({
        host: container.getHost(),
        port: container.getPort(),
        username: container.getUsername(),
        password: container.getPassword(),
        database: container.getDatabase(),
      }),
    );
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'each' });

    const cityId = await InsertRow(
      `INSERT INTO cities (name, slug, region) VALUES ('Podgorica', 'podgorica-pa', 'Central') RETURNING id`,
      [],
    );
    categoryId = await InsertRow(
      `INSERT INTO categories (name, slug) VALUES ('Phones', 'phones-pa') RETURNING id`,
      [],
    );
    approvedId = await InsertProvider('approved-shop', true, cityId);
    waitingId = await InsertProvider('waiting-shop', false, cityId);
    repository = new ProviderRepository(dataSource.getRepository(Provider), {
      required: false,
    });
  });

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  it('defaults a newly inserted provider to unapproved', async () => {
    const [row] = await dataSource.query<{ approved: boolean }[]>(
      `SELECT approved FROM providers WHERE id = $1`,
      [waitingId],
    );
    expect(row.approved).toBe(false);
  });

  it('shows only approved providers in the public list', async () => {
    const result = await repository.List({}, 1, 50);

    expect(result.items.map((provider) => provider.id)).toEqual([approvedId]);
    expect(result.total).toBe(1);
  });

  it('notifies only approved providers about new requests in their category', async () => {
    const eligible = await repository.ListEligibleForCategory(categoryId);

    expect(eligible.map((provider) => provider.id)).toEqual([approvedId]);
  });

  it('counts only approved providers per category', async () => {
    const categories = new CategoriesRepository(
      dataSource.getRepository(Category),
    );

    const rows = await categories.ListWithProviderCounts([
      VerificationStatus.Verified,
      VerificationStatus.Pending,
    ]);

    expect(rows.find((row) => row.id === categoryId)?.providerCount).toBe(1);
  });

  it('lets an admin list providers waiting for approval, with their owner', async () => {
    const result = await repository.ListForAdmin({ approved: false }, 1, 50);

    expect(result.items.map((provider) => provider.id)).toEqual([waitingId]);
    expect(result.items[0].ownerUser.fullName).toBe('Owner waiting-shop');
  });

  it('makes a provider public once it is approved', async () => {
    await repository.SetApproved(waitingId, true);

    const result = await repository.List({}, 1, 50);

    expect(result.items.map((provider) => provider.id).sort()).toEqual(
      [approvedId, waitingId].sort(),
    );
  });
});
