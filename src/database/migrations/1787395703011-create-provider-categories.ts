import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProviderCategories1787395703011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "provider_categories" (
        "provider_id" uuid NOT NULL REFERENCES "providers" ("id") ON DELETE CASCADE,
        "category_id" uuid NOT NULL REFERENCES "categories" ("id") ON DELETE CASCADE,
        PRIMARY KEY ("provider_id", "category_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_categories_category_id_provider_id" ON "provider_categories" ("category_id", "provider_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "provider_categories"`);
  }
}
