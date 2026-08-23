import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDirectInquiries1787395703081 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "inquiry_status_enum" AS ENUM ('new', 'contacted', 'closed')
    `);
    await queryRunner.query(`
      CREATE TABLE "direct_inquiries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "customer_id" uuid REFERENCES "users" ("id"),
        "provider_id" uuid NOT NULL REFERENCES "providers" ("id"),
        "name" text,
        "contact_email" text,
        "contact_phone" text,
        "message" text NOT NULL,
        "status" inquiry_status_enum NOT NULL DEFAULT 'new',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_direct_inquiries_customer_id" ON "direct_inquiries" ("customer_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_direct_inquiries_provider_id" ON "direct_inquiries" ("provider_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_direct_inquiries_provider_id_status" ON "direct_inquiries" ("provider_id", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "direct_inquiries"`);
    await queryRunner.query(`DROP TYPE "inquiry_status_enum"`);
  }
}
