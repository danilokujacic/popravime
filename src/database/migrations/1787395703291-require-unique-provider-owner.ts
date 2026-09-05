import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireUniqueProviderOwner1787395703291
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "idx_providers_owner_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "providers" ADD CONSTRAINT "providers_owner_user_id_key" UNIQUE ("owner_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "providers" DROP CONSTRAINT "providers_owner_user_id_key"
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_providers_owner_user_id" ON "providers" ("owner_user_id")
    `);
  }
}
