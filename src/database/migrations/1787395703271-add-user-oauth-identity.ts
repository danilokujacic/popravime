import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserOauthIdentity1787395703271 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "oauth_provider_enum" AS ENUM ('google', 'facebook')
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "oauth_provider" oauth_provider_enum
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "oauth_id" text
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_users_oauth_provider_oauth_id"
        ON "users" ("oauth_provider", "oauth_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "idx_users_oauth_provider_oauth_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "oauth_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "oauth_provider"
    `);
    await queryRunner.query(`
      DROP TYPE "oauth_provider_enum"
    `);
  }
}
