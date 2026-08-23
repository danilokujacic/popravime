import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessages1787395703091 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid REFERENCES "repair_requests" ("id"),
        "inquiry_id" uuid REFERENCES "direct_inquiries" ("id"),
        "sender_id" uuid NOT NULL REFERENCES "users" ("id"),
        "body" text NOT NULL,
        "attachment_url" text,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "chk_messages_exactly_one_conversation" CHECK (
          ("request_id" IS NOT NULL AND "inquiry_id" IS NULL)
          OR ("request_id" IS NULL AND "inquiry_id" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_messages_sender_id" ON "messages" ("sender_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_messages_request_id_created_at" ON "messages" ("request_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_messages_inquiry_id_created_at" ON "messages" ("inquiry_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "messages"`);
  }
}
