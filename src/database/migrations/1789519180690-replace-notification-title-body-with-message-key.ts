import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceNotificationTitleBodyWithMessageKey1789519180690
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications" RENAME COLUMN "title" TO "message_key"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP COLUMN "body"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications" ADD COLUMN "message_params" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Existing rows' message_key values are pre-refactor English titles, not real i18n keys —
    // this rollback restores the columns, not the original title/body text those rows had.
    await queryRunner.query(`
      ALTER TABLE "notifications" DROP COLUMN "message_params"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications" RENAME COLUMN "message_key" TO "title"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications" ADD COLUMN "body" text NOT NULL DEFAULT ''
    `);
  }
}
