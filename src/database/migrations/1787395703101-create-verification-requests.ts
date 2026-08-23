import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVerificationRequests1787395703101 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "verification_request_status_enum" AS ENUM ('pending', 'approved', 'rejected')
    `);
    await queryRunner.query(`
      CREATE TABLE "verification_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers" ("id"),
        "document_url" text NOT NULL,
        "apr_number" text NOT NULL,
        "status" verification_request_status_enum NOT NULL DEFAULT 'pending',
        "reviewed_by_admin_id" uuid REFERENCES "users" ("id"),
        "review_notes" text,
        "submitted_at" timestamptz NOT NULL DEFAULT now(),
        "reviewed_at" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_verification_requests_provider_id" ON "verification_requests" ("provider_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_verification_requests_provider_id_status" ON "verification_requests" ("provider_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "verification_requests"`);
    await queryRunner.query(`DROP TYPE "verification_request_status_enum"`);
  }
}
