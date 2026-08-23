import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePriceEstimates1787395703131 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "price_estimates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL REFERENCES "categories" ("id"),
        "service_type" text NOT NULL,
        "price_min" decimal(10,2) NOT NULL,
        "price_max" decimal(10,2) NOT NULL,
        "currency" text NOT NULL DEFAULT 'EUR'
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_price_estimates_category_id" ON "price_estimates" ("category_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_price_estimates_category_id_service_type" ON "price_estimates" ("category_id", "service_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "price_estimates"`);
  }
}
