import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReviews1787395703071 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid REFERENCES "repair_requests" ("id"),
        "customer_id" uuid NOT NULL REFERENCES "users" ("id"),
        "provider_id" uuid NOT NULL REFERENCES "providers" ("id"),
        "rating" integer NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
        "comment" text NOT NULL,
        "provider_response" text,
        "is_published" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_reviews_request_id_unique" ON "reviews" ("request_id") WHERE "request_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_reviews_customer_id" ON "reviews" ("customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_reviews_provider_id" ON "reviews" ("provider_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_reviews_provider_id_is_published" ON "reviews" ("provider_id", "is_published")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reviews"`);
  }
}
