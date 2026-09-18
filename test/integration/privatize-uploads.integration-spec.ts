import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { BuildDataSourceOptions } from '../../src/database/data-source-options';
import {
  PrivatizeUploads,
  UploadMigrationStorage,
} from '../../src/database/scripts/privatize-uploads';

jest.setTimeout(180000);

const PUBLIC_PREFIX = 'https://cdn.example.com/';

interface IdRow {
  id: string;
}

describe('Privatize uploads integration', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let requestId: string;
  let messageId: string;
  let verificationId: string;

  async function InsertRow(statement: string, parameters: unknown[]) {
    const rows = await dataSource.query<IdRow[]>(statement, parameters);
    return rows[0].id;
  }

  function BuildStorage(failDeleteFor?: string) {
    const copied: string[] = [];
    const deleted: string[] = [];
    const storage: UploadMigrationStorage = {
      CopyToPrivate: (key) => {
        copied.push(key);
        return Promise.resolve();
      },
      DeletePublic: (key) =>
        key === failDeleteFor
          ? Promise.reject(new Error('delete failed'))
          : Promise.resolve().then(() => {
              deleted.push(key);
            }),
    };
    return { storage, copied, deleted };
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
      `INSERT INTO cities (name, slug, region) VALUES ('Podgorica', 'podgorica-pu', 'Central') RETURNING id`,
      [],
    );
    const categoryId = await InsertRow(
      `INSERT INTO categories (name, slug) VALUES ('Phones', 'phones-pu') RETURNING id`,
      [],
    );
    const customerId = await InsertRow(
      `INSERT INTO users (email, password_hash, full_name) VALUES ('c@example.com', 'h', 'C') RETURNING id`,
      [],
    );
    const ownerId = await InsertRow(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES ('o@example.com', 'h', 'O', 'provider_owner') RETURNING id`,
      [],
    );
    const providerId = await InsertRow(
      `INSERT INTO providers (owner_user_id, business_name, slug, address, city_id)
       VALUES ($1, 'Shop', 'shop-pu', 'Street 1', $2) RETURNING id`,
      [ownerId, cityId],
    );
    requestId = await InsertRow(
      `INSERT INTO repair_requests (customer_id, category_id, description, photo_urls, city_id)
       VALUES ($1, $2, 'Broken', $3, $4) RETURNING id`,
      [
        customerId,
        categoryId,
        [
          `${PUBLIC_PREFIX}a.jpg`,
          'private:already.jpg',
          'https://elsewhere.example.com/keep.jpg',
        ],
        cityId,
      ],
    );
    messageId = await InsertRow(
      `INSERT INTO messages (request_id, sender_id, body, attachment_url)
       VALUES ($1, $2, 'hi', $3) RETURNING id`,
      [requestId, customerId, `${PUBLIC_PREFIX}b.pdf`],
    );
    verificationId = await InsertRow(
      `INSERT INTO verification_requests (provider_id, document_url, apr_number)
       VALUES ($1, $2, '123') RETURNING id`,
      [providerId, `${PUBLIC_PREFIX}c.pdf`],
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  it('changes nothing on a dry run but counts what it would move', async () => {
    const { storage, copied } = BuildStorage();

    const summary = await new PrivatizeUploads(
      dataSource,
      storage,
      PUBLIC_PREFIX,
      true,
    ).Run();

    expect(summary).toEqual({ rows: 3, objects: 3, leftInPublicBucket: [] });
    expect(copied).toEqual([]);
    const [request] = await dataSource.query<{ photo_urls: string[] }[]>(
      `SELECT photo_urls FROM repair_requests WHERE id = $1`,
      [requestId],
    );
    expect(request.photo_urls[0]).toBe(`${PUBLIC_PREFIX}a.jpg`);
  });

  it('copies each public object, rewrites the rows to private references and reports objects it could not delete', async () => {
    const { storage, copied, deleted } = BuildStorage('c.pdf');

    const summary = await new PrivatizeUploads(
      dataSource,
      storage,
      PUBLIC_PREFIX,
      false,
    ).Run();

    expect(copied.sort()).toEqual(['a.jpg', 'b.pdf', 'c.pdf']);
    expect(deleted.sort()).toEqual(['a.jpg', 'b.pdf']);
    expect(summary.leftInPublicBucket).toEqual(['c.pdf']);

    const [request] = await dataSource.query<{ photo_urls: string[] }[]>(
      `SELECT photo_urls FROM repair_requests WHERE id = $1`,
      [requestId],
    );
    expect(request.photo_urls).toEqual([
      'private:a.jpg',
      'private:already.jpg',
      'https://elsewhere.example.com/keep.jpg',
    ]);
    const [message] = await dataSource.query<{ attachment_url: string }[]>(
      `SELECT attachment_url FROM messages WHERE id = $1`,
      [messageId],
    );
    expect(message.attachment_url).toBe('private:b.pdf');
    const [verification] = await dataSource.query<{ document_url: string }[]>(
      `SELECT document_url FROM verification_requests WHERE id = $1`,
      [verificationId],
    );
    expect(verification.document_url).toBe('private:c.pdf');
  });

  it('is idempotent: a second run finds nothing left to move', async () => {
    const { storage, copied } = BuildStorage();

    const summary = await new PrivatizeUploads(
      dataSource,
      storage,
      PUBLIC_PREFIX,
      false,
    ).Run();

    expect(summary).toEqual({ rows: 0, objects: 0, leftInPublicBucket: [] });
    expect(copied).toEqual([]);
  });
});
