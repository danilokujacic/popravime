import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLocale1789600386091 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_locale_enum" AS ENUM ('me', 'en')
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "locale" user_locale_enum NOT NULL DEFAULT 'me'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "locale"`);
    await queryRunner.query(`DROP TYPE "user_locale_enum"`);
  }
}
