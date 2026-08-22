import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOffers1787395703041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "parts_type_enum" AS ENUM ('original', 'oem', 'aftermarket')
    `);
    await queryRunner.query(`
      CREATE TYPE "offer_status_enum" AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn')
    `);
    await queryRunner.query(`
      CREATE TABLE "offers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL REFERENCES "repair_requests" ("id") ON DELETE CASCADE,
        "provider_id" uuid NOT NULL REFERENCES "providers" ("id"),
        "price_min" decimal(10,2) NOT NULL,
        "price_max" decimal(10,2) NOT NULL,
        "estimated_duration" text NOT NULL,
        "parts_type" parts_type_enum NOT NULL,
        "message" text,
        "status" offer_status_enum NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_offers_request_id" ON "offers" ("request_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_offers_provider_id" ON "offers" ("provider_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_offers_request_id_status" ON "offers" ("request_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "offers"`);
    await queryRunner.query(`DROP TYPE "offer_status_enum"`);
    await queryRunner.query(`DROP TYPE "parts_type_enum"`);
  }
}
