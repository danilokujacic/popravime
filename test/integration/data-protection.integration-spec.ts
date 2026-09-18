import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { BuildDataSourceOptions } from '../../src/database/data-source-options';
import { AccountErasureRepository } from '../../src/modules/account-data/account-erasure.repository';
import { RetentionRepository } from '../../src/modules/retention/retention.repository';
import { UsersRepository } from '../../src/modules/users/users.repository';
import { User } from '../../src/modules/users/entities/user.entity';

jest.setTimeout(180000);

interface IdRow {
  id: string;
}

describe('Data protection integration', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let cityId: string;
  let categoryId: string;

  async function InsertRow(statement: string, parameters: unknown[]) {
    const rows = await dataSource.query<IdRow[]>(statement, parameters);
    return rows[0].id;
  }

  function InsertUser(email: string, role = 'customer'): Promise<string> {
    return InsertRow(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, 'hash', 'Real Name', '+38267000000', $2) RETURNING id`,
      [email, role],
    );
  }

  function InsertRequest(
    customerId: string,
    status: string,
    photoUrls: string[] = [],
  ): Promise<string> {
    return InsertRow(
      `INSERT INTO repair_requests
         (customer_id, category_id, description, photo_urls, city_id, status)
       VALUES ($1, $2, 'Broken screen', $3, $4, $5) RETURNING id`,
      [customerId, categoryId, photoUrls, cityId, status],
    );
  }

  async function InsertProvider(ownerId: string, slug: string) {
    return InsertRow(
      `INSERT INTO providers (owner_user_id, business_name, slug, address, city_id, phone, email)
       VALUES ($1, 'Shop', $2, 'Main street 1', $3, '+38268000000', 'shop@example.com')
       RETURNING id`,
      [ownerId, slug, cityId],
    );
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

    cityId = await InsertRow(
      `INSERT INTO cities (name, slug, region) VALUES ('Podgorica', 'podgorica-dp', 'Central') RETURNING id`,
      [],
    );
    categoryId = await InsertRow(
      `INSERT INTO categories (name, slug) VALUES ('Mobile phones', 'mobile-phones-dp') RETURNING id`,
      [],
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  it('starts the inactivity clock for every user and leaves terms unset until accepted', async () => {
    const userId = await InsertUser('stamp@example.com');
    const [user] = await dataSource.query<
      {
        last_active_at: Date | null;
        terms_accepted_at: Date | null;
        terms_version: string | null;
      }[]
    >(
      `SELECT last_active_at, terms_accepted_at, terms_version FROM users WHERE id = $1`,
      [userId],
    );

    expect(user.last_active_at).not.toBeNull();
    expect(user.terms_accepted_at).toBeNull();
    expect(user.terms_version).toBeNull();
  });

  describe('inactive accounts', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;

    async function SetActivity(userId: string, daysAgo: number) {
      await dataSource.query(
        `UPDATE users SET last_active_at = $2 WHERE id = $1`,
        [userId, new Date(Date.now() - daysAgo * DAY_MS)],
      );
    }

    it('selects only stale, non-admin, non-erased accounts', async () => {
      const repository = new RetentionRepository(dataSource);
      const stale = await InsertUser('stale@example.com');
      const fresh = await InsertUser('fresh@example.com');
      const staleAdmin = await InsertUser('stale-admin@example.com', 'admin');
      const staleErased = await InsertUser('stale-erased@example.com');
      await SetActivity(stale, 90);
      await SetActivity(fresh, 5);
      await SetActivity(staleAdmin, 90);
      await SetActivity(staleErased, 90);
      await dataSource.query(
        `UPDATE users SET deleted_at = now() WHERE id = $1`,
        [staleErased],
      );

      const ids = await repository.FindInactiveUserIds(
        new Date(Date.now() - 60 * DAY_MS),
        500,
      );

      expect(ids).toContain(stale);
      expect(ids).not.toContain(fresh);
      expect(ids).not.toContain(staleAdmin);
      expect(ids).not.toContain(staleErased);
    });

    it('only moves the activity timestamp forward when it is stale', async () => {
      const repository = new UsersRepository(dataSource.getRepository(User));
      const staleUser = await InsertUser('touch-stale@example.com');
      const freshUser = await InsertUser('touch-fresh@example.com');
      await SetActivity(staleUser, 10);
      await SetActivity(freshUser, 0);
      const [{ last_active_at: freshBefore }] = await dataSource.query<
        { last_active_at: Date }[]
      >(`SELECT last_active_at FROM users WHERE id = $1`, [freshUser]);

      const staleBefore = new Date(Date.now() - DAY_MS);
      await repository.TouchActivity(staleUser, staleBefore);
      await repository.TouchActivity(freshUser, staleBefore);

      const [staleAfter] = await dataSource.query<{ last_active_at: Date }[]>(
        `SELECT last_active_at FROM users WHERE id = $1`,
        [staleUser],
      );
      const [freshAfter] = await dataSource.query<{ last_active_at: Date }[]>(
        `SELECT last_active_at FROM users WHERE id = $1`,
        [freshUser],
      );
      expect(
        Date.now() - new Date(staleAfter.last_active_at).getTime(),
      ).toBeLessThan(DAY_MS);
      expect(new Date(freshAfter.last_active_at).getTime()).toBe(
        new Date(freshBefore).getTime(),
      );
    });
  });

  describe('account erasure', () => {
    it('reports active work for a customer with an accepted request', async () => {
      const repository = new AccountErasureRepository(dataSource);
      const customerId = await InsertUser('busy@example.com');
      await InsertRequest(customerId, 'accepted');

      await expect(repository.HasActiveWork(customerId)).resolves.toBe(true);
    });

    it('reports no active work for a customer with only open requests', async () => {
      const repository = new AccountErasureRepository(dataSource);
      const customerId = await InsertUser('idle@example.com');
      await InsertRequest(customerId, 'open');

      await expect(repository.HasActiveWork(customerId)).resolves.toBe(false);
    });

    it('anonymises the user, cancels open requests and returns files to delete', async () => {
      const repository = new AccountErasureRepository(dataSource);
      const customerId = await InsertUser('erase-me@example.com');
      const openRequestId = await InsertRequest(customerId, 'open', [
        'https://files.example.com/photo-1.jpg',
      ]);
      const completedRequestId = await InsertRequest(customerId, 'completed', [
        'https://files.example.com/photo-2.jpg',
      ]);
      await InsertRow(
        `INSERT INTO messages (request_id, sender_id, body, attachment_url)
         VALUES ($1, $2, 'hi', 'https://files.example.com/attachment.pdf') RETURNING id`,
        [completedRequestId, customerId],
      );
      await InsertRow(
        `INSERT INTO notifications (user_id, type, message_key)
         VALUES ($1, 'new_offer', 'new_offer') RETURNING id`,
        [customerId],
      );
      await InsertRow(
        `INSERT INTO contact_messages (name, email, subject, message)
         VALUES ('Real Name', 'ERASE-ME@example.com', 's', 'm') RETURNING id`,
        [],
      );
      await InsertRow(
        `INSERT INTO direct_inquiries (customer_id, provider_id, name, contact_email, contact_phone, message)
         VALUES ($1, $2, 'Real Name', 'erase-me@example.com', '+38267000000', 'hello') RETURNING id`,
        [
          customerId,
          await InsertProvider(
            await InsertUser('other-owner@example.com', 'provider_owner'),
            'other-shop',
          ),
        ],
      );

      const fileUrls = await repository.Erase(customerId);

      expect(fileUrls.sort()).toEqual([
        'https://files.example.com/attachment.pdf',
        'https://files.example.com/photo-1.jpg',
        'https://files.example.com/photo-2.jpg',
      ]);

      const [user] = await dataSource.query<
        {
          email: string;
          full_name: string;
          phone: string | null;
          deleted_at: Date | null;
        }[]
      >(`SELECT email, full_name, phone, deleted_at FROM users WHERE id = $1`, [
        customerId,
      ]);
      expect(user.email).toBe(`deleted-${customerId}@deleted.invalid`);
      expect(user.full_name).toBe('Deleted user');
      expect(user.phone).toBeNull();
      expect(user.deleted_at).not.toBeNull();

      const requests = await dataSource.query<
        { id: string; status: string; photo_urls: string[] }[]
      >(
        `SELECT id, status, photo_urls FROM repair_requests WHERE customer_id = $1`,
        [customerId],
      );
      const byId = new Map(requests.map((row) => [row.id, row]));
      expect(byId.get(openRequestId)?.status).toBe('cancelled');
      expect(byId.get(completedRequestId)?.status).toBe('completed');
      expect(requests.every((row) => row.photo_urls.length === 0)).toBe(true);

      const [{ count: notifications }] = await dataSource.query<
        { count: string }[]
      >(`SELECT count(*) FROM notifications WHERE user_id = $1`, [customerId]);
      expect(notifications).toBe('0');

      const [{ count: contactMessages }] = await dataSource.query<
        { count: string }[]
      >(
        `SELECT count(*) FROM contact_messages WHERE lower(email) = 'erase-me@example.com'`,
      );
      expect(contactMessages).toBe('0');

      const [inquiry] = await dataSource.query<
        {
          name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
        }[]
      >(
        `SELECT name, contact_email, contact_phone FROM direct_inquiries WHERE customer_id = $1`,
        [customerId],
      );
      expect(inquiry).toEqual({
        name: null,
        contact_email: null,
        contact_phone: null,
      });
    });

    it('strips a provider profile and hides it from the directory', async () => {
      const repository = new AccountErasureRepository(dataSource);
      const ownerId = await InsertUser(
        'owner-erase@example.com',
        'provider_owner',
      );
      const providerId = await InsertProvider(ownerId, 'erase-shop');
      await dataSource.query(
        `UPDATE providers SET verification_status = 'verified', is_certified = true WHERE id = $1`,
        [providerId],
      );
      await InsertRow(
        `INSERT INTO provider_gallery (provider_id, image_url, storage_key)
         VALUES ($1, 'https://files.example.com/gallery.jpg', 'gallery.jpg') RETURNING id`,
        [providerId],
      );
      await InsertRow(
        `INSERT INTO verification_requests (provider_id, document_url, apr_number)
         VALUES ($1, 'https://files.example.com/document.pdf', '12345') RETURNING id`,
        [providerId],
      );

      const fileUrls = await repository.Erase(ownerId);

      expect(fileUrls.sort()).toEqual([
        'https://files.example.com/document.pdf',
        'https://files.example.com/gallery.jpg',
      ]);
      const [provider] = await dataSource.query<
        {
          business_name: string;
          slug: string;
          phone: string | null;
          email: string | null;
          verification_status: string;
          is_certified: boolean;
        }[]
      >(`SELECT * FROM providers WHERE id = $1`, [providerId]);
      expect(provider.business_name).toBe('Deleted provider');
      expect(provider.slug).toBe(`deleted-${providerId}`);
      expect(provider.phone).toBeNull();
      expect(provider.email).toBeNull();
      expect(provider.verification_status).toBe('rejected');
      expect(provider.is_certified).toBe(false);
    });
  });

  describe('retention purge', () => {
    const YEAR_AGO = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
    const THREE_YEARS_AGO = new Date(Date.now() - 1100 * 24 * 60 * 60 * 1000);
    const EIGHT_MONTHS_AGO = new Date(Date.now() - 240 * 24 * 60 * 60 * 1000);

    async function AgeRequest(id: string, updatedAt: Date) {
      await dataSource.query(
        `UPDATE repair_requests SET updated_at = $2 WHERE id = $1`,
        [id, updatedAt],
      );
    }

    it('purges old closed requests with their offers and messages, and keeps recent ones', async () => {
      const repository = new RetentionRepository(dataSource);
      const customerId = await InsertUser('retention@example.com');
      const ownerId = await InsertUser(
        'retention-owner@example.com',
        'provider_owner',
      );
      const providerId = await InsertProvider(ownerId, 'retention-shop');

      const oldCompleted = await InsertRequest(customerId, 'completed', [
        'https://files.example.com/old.jpg',
      ]);
      const offerId = await InsertRow(
        `INSERT INTO offers (request_id, provider_id, price_min, price_max, estimated_duration, parts_type, status)
         VALUES ($1, $2, 10, 20, '1 day', 'oem', 'accepted') RETURNING id`,
        [oldCompleted, providerId],
      );
      await dataSource.query(
        `UPDATE repair_requests SET accepted_offer_id = $2 WHERE id = $1`,
        [oldCompleted, offerId],
      );
      await InsertRow(
        `INSERT INTO messages (request_id, sender_id, body, attachment_url)
         VALUES ($1, $2, 'old', 'https://files.example.com/old-attachment.pdf') RETURNING id`,
        [oldCompleted, customerId],
      );
      const reviewId = await InsertRow(
        `INSERT INTO reviews (request_id, customer_id, provider_id, rating, comment)
         VALUES ($1, $2, $3, 5, 'great') RETURNING id`,
        [oldCompleted, customerId, providerId],
      );
      await AgeRequest(oldCompleted, THREE_YEARS_AGO);

      const oldRejected = await InsertRequest(customerId, 'rejected');
      await AgeRequest(oldRejected, EIGHT_MONTHS_AGO);

      const recentCompleted = await InsertRequest(customerId, 'completed');
      const recentRejected = await InsertRequest(customerId, 'rejected');

      const outcome = await repository.PurgeClosedRequests(
        new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        500,
      );

      expect(outcome.records).toBe(2);
      expect(outcome.fileUrls.sort()).toEqual([
        'https://files.example.com/old-attachment.pdf',
        'https://files.example.com/old.jpg',
      ]);

      const remaining = await dataSource.query<IdRow[]>(
        `SELECT id FROM repair_requests WHERE customer_id = $1`,
        [customerId],
      );
      expect(remaining.map((row) => row.id).sort()).toEqual(
        [recentCompleted, recentRejected].sort(),
      );

      const [review] = await dataSource.query<{ request_id: string | null }[]>(
        `SELECT request_id FROM reviews WHERE id = $1`,
        [reviewId],
      );
      expect(review.request_id).toBeNull();
    });

    it('purges old inquiries, contact messages and expired confirmations', async () => {
      const repository = new RetentionRepository(dataSource);
      const ownerId = await InsertUser(
        'inq-owner@example.com',
        'provider_owner',
      );
      const providerId = await InsertProvider(ownerId, 'inq-shop');

      const oldInquiry = await InsertRow(
        `INSERT INTO direct_inquiries (provider_id, name, contact_email, message, created_at)
         VALUES ($1, 'Guest', 'guest@example.com', 'old', $2) RETURNING id`,
        [providerId, YEAR_AGO],
      );
      const recentInquiry = await InsertRow(
        `INSERT INTO direct_inquiries (provider_id, name, contact_email, message)
         VALUES ($1, 'Guest', 'guest2@example.com', 'new') RETURNING id`,
        [providerId],
      );
      await InsertRow(
        `INSERT INTO contact_messages (name, email, subject, message, created_at)
         VALUES ('Old', 'old@example.com', 's', 'm', $1) RETURNING id`,
        [YEAR_AGO],
      );
      await InsertRow(
        `INSERT INTO email_confirmations (slug, email, expires_at)
         VALUES ('expired-slug', 'x@example.com', now() - interval '1 day') RETURNING id`,
        [],
      );
      await InsertRow(
        `INSERT INTO email_confirmations (slug, email, expires_at)
         VALUES ('live-slug', 'y@example.com', now() + interval '1 day') RETURNING id`,
        [],
      );

      const inquiries = await repository.PurgeInquiries(
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        500,
      );
      const contactMessages = await repository.PurgeContactMessages(
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      );
      const confirmations = await repository.PurgeExpiredConfirmations();

      expect(inquiries.records).toBe(1);
      expect(contactMessages).toBe(1);
      expect(confirmations).toBe(1);

      const remaining = await dataSource.query<IdRow[]>(
        `SELECT id FROM direct_inquiries WHERE provider_id = $1`,
        [providerId],
      );
      expect(remaining.map((row) => row.id)).toEqual([recentInquiry]);
      expect(remaining.map((row) => row.id)).not.toContain(oldInquiry);
    });
  });
});
