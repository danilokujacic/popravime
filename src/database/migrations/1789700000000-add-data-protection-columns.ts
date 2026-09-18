import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDataProtectionColumns1789700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "terms_accepted_at" timestamptz,
        ADD COLUMN "terms_version" text,
        ADD COLUMN "deleted_at" timestamptz,
        ADD COLUMN "last_active_at" timestamptz NOT NULL DEFAULT now()
    `);
    await queryRunner.query(`
      ALTER TABLE "direct_inquiries"
        ADD COLUMN "terms_accepted_at" timestamptz,
        ADD COLUMN "terms_version" text
    `);
    await queryRunner.query(`
      ALTER TABLE "contact_messages"
        ADD COLUMN "terms_accepted_at" timestamptz,
        ADD COLUMN "terms_version" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contact_messages"
        DROP COLUMN "terms_version",
        DROP COLUMN "terms_accepted_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "direct_inquiries"
        DROP COLUMN "terms_version",
        DROP COLUMN "terms_accepted_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "last_active_at",
        DROP COLUMN "deleted_at",
        DROP COLUMN "terms_version",
        DROP COLUMN "terms_accepted_at"
    `);
  }
}
