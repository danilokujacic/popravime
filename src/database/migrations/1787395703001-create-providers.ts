import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProviders1787395703001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "verification_status_enum" AS ENUM ('pending', 'verified', 'rejected')
    `);
    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_user_id" uuid NOT NULL REFERENCES "users" ("id"),
        "business_name" text NOT NULL,
        "slug" text NOT NULL UNIQUE,
        "description" text,
        "address" text NOT NULL,
        "city_id" uuid NOT NULL REFERENCES "cities" ("id"),
        "latitude" decimal(9,6),
        "longitude" decimal(9,6),
        "phone" text,
        "email" text,
        "website" text,
        "working_hours" jsonb,
        "apr_registration_number" text,
        "verification_status" verification_status_enum NOT NULL DEFAULT 'pending',
        "is_certified" boolean NOT NULL DEFAULT false,
        "average_rating" decimal(3,2),
        "review_count" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_providers_owner_user_id" ON "providers" ("owner_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_providers_slug" ON "providers" ("slug")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_providers_city_id_verification_status" ON "providers" ("city_id", "verification_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "providers"`);
    await queryRunner.query(`DROP TYPE "verification_status_enum"`);
  }
}
