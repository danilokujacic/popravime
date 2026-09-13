import { DataSource } from 'typeorm';
import { PasswordHasher } from '../../shared/password/password-hasher';

const CUSTOMER_EMAIL = 'customer@popravime.me';
const CUSTOMER_PASSWORD = 'Customer12345!';
const CUSTOMER_FULL_NAME = 'Test Customer';
const CUSTOMER_PHONE = '+38267000001';

export async function SeedCustomer(dataSource: DataSource): Promise<void> {
  const passwordHasher = new PasswordHasher({
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  });
  const passwordHash = await passwordHasher.Hash(CUSTOMER_PASSWORD);

  await dataSource.query(
    `INSERT INTO "users" ("email", "password_hash", "full_name", "phone", "role", "email_verified")
     VALUES ($1, $2, $3, $4, 'customer', true)
     ON CONFLICT ("email") DO NOTHING`,
    [CUSTOMER_EMAIL, passwordHash, CUSTOMER_FULL_NAME, CUSTOMER_PHONE],
  );
}
