import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContactMessages1787395703141 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "contact_message_status_enum" AS ENUM ('new', 'in_progress', 'resolved')
    `);
    await queryRunner.query(`
      CREATE TABLE "contact_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "email" text NOT NULL,
        "subject" text NOT NULL,
        "message" text NOT NULL,
        "status" contact_message_status_enum NOT NULL DEFAULT 'new',
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_contact_messages_status" ON "contact_messages" ("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contact_messages"`);
    await queryRunner.query(`DROP TYPE "contact_message_status_enum"`);
  }
}
