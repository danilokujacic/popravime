import { DataSource } from 'typeorm';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { SlugGenerator } from '../../shared/slug/slug.generator';

interface IdRow {
  id: string;
}

const PROVIDER_EMAIL = 'provider@popravime.me';
const PROVIDER_PASSWORD = 'Provider12345!';
const PROVIDER_FULL_NAME = 'Test Provider';
const PROVIDER_PHONE = '+38267000000';
const BUSINESS_NAME = 'Popravi Me Test Servis';
const BUSINESS_ADDRESS = 'Bulevar Svetog Petra Cetinjskog 1';
const BUSINESS_CITY_SLUG = 'podgorica';
const BUSINESS_CATEGORY_SLUGS = ['mobile-phones', 'computers'];

export async function SeedProvider(dataSource: DataSource): Promise<void> {
  const passwordHasher = new PasswordHasher({
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  });
  const passwordHash = await passwordHasher.Hash(PROVIDER_PASSWORD);

  const [user] = await dataSource.query<IdRow[]>(
    `INSERT INTO "users" ("email", "password_hash", "full_name", "role")
     VALUES ($1, $2, $3, 'provider_owner')
     ON CONFLICT ("email") DO UPDATE SET "email" = EXCLUDED."email"
     RETURNING "id"`,
    [PROVIDER_EMAIL, passwordHash, PROVIDER_FULL_NAME],
  );

  const existingProvider = await dataSource.query<IdRow[]>(
    `SELECT "id" FROM "providers" WHERE "owner_user_id" = $1 LIMIT 1`,
    [user.id],
  );
  if (existingProvider.length > 0) {
    return;
  }

  const [city] = await dataSource.query<IdRow[]>(
    `SELECT "id" FROM "cities" WHERE "slug" = $1 LIMIT 1`,
    [BUSINESS_CITY_SLUG],
  );
  if (!city) {
    return;
  }

  const slug = await SlugGenerator.GenerateUnique(
    BUSINESS_NAME,
    async (candidate) => {
      const rows = await dataSource.query<unknown[]>(
        `SELECT 1 FROM "providers" WHERE "slug" = $1`,
        [candidate],
      );
      return rows.length > 0;
    },
  );

  const [provider] = await dataSource.query<IdRow[]>(
    `INSERT INTO "providers"
       ("owner_user_id", "business_name", "slug", "address", "city_id", "phone", "email")
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING "id"`,
    [
      user.id,
      BUSINESS_NAME,
      slug,
      BUSINESS_ADDRESS,
      city.id,
      PROVIDER_PHONE,
      PROVIDER_EMAIL,
    ],
  );

  const categories = await dataSource.query<IdRow[]>(
    `SELECT "id" FROM "categories" WHERE "slug" = ANY($1::text[])`,
    [BUSINESS_CATEGORY_SLUGS],
  );
  for (const category of categories) {
    await dataSource.query(
      `INSERT INTO "provider_categories" ("provider_id", "category_id")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [provider.id, category.id],
    );
  }
}
