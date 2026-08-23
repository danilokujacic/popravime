import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1787395703061 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'new_offer', 'offer_accepted', 'status_change', 'new_review',
        'verification_approved', 'verification_rejected', 'new_message', 'new_inquiry'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "type" notification_type_enum NOT NULL,
        "title" text NOT NULL,
        "body" text NOT NULL,
        "related_entity_type" text,
        "related_entity_id" uuid,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_id" ON "notifications" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_notifications_user_id_is_read_created_at" ON "notifications" ("user_id", "is_read", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
  }
}
