import { DataSource } from 'typeorm';
import { PasswordHasher } from '../../shared/password/password-hasher';

export async function SeedAdmin(dataSource: DataSource): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return;
  }

  const passwordHasher = new PasswordHasher({
    saltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  });
  const passwordHash = await passwordHasher.Hash(password);

  await dataSource.query(
    `INSERT INTO "users" ("email", "password_hash", "full_name", "role")
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT ("email") DO NOTHING`,
    [email, passwordHash, 'Admin'],
  );
}
