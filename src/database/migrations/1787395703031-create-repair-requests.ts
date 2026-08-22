import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRepairRequests1787395703031 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "urgency_enum" AS ENUM ('standard', 'urgent')
    `);
    await queryRunner.query(`
      CREATE TYPE "request_status_enum" AS ENUM (
        'open', 'offers_received', 'accepted', 'in_progress', 'completed', 'cancelled'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "repair_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL REFERENCES "users" ("id"),
        "category_id" uuid NOT NULL REFERENCES "categories" ("id"),
        "brand" text,
        "model" text,
        "description" text NOT NULL,
        "photo_urls" text[] NOT NULL DEFAULT '{}',
        "city_id" uuid NOT NULL REFERENCES "cities" ("id"),
        "urgency" urgency_enum NOT NULL DEFAULT 'standard',
        "status" request_status_enum NOT NULL DEFAULT 'open',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_repair_requests_status_city_id" ON "repair_requests" ("status", "city_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_repair_requests_customer_id_status" ON "repair_requests" ("customer_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "repair_requests"`);
    await queryRunner.query(`DROP TYPE "request_status_enum"`);
    await queryRunner.query(`DROP TYPE "urgency_enum"`);
  }
}
