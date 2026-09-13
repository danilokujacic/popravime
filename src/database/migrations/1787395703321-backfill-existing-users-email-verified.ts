import { MigrationInterface, QueryRunner } from 'typeorm';

// The original CreateUsers migration's source *claims* `email_verified boolean NOT NULL DEFAULT
// false` was part of the initial table — but the column was never actually present on any
// environment migrated from that file (checked: local dev's `users` table has no such column).
// Whatever happened there, the safe fix is a normal forward migration rather than touching an
// already-applied one. Every account that already exists — and could already log in fine before
// this shipped — is grandfathered in as verified; only *new* plain registrations from here on
// start unverified (OAuth signups set it true at creation time).
export class BackfillExistingUsersEmailVerified1787395703321 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      UPDATE "users" SET "email_verified" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified"`);
  }
}
