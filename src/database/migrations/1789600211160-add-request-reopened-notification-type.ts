import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestReopenedNotificationType1789600211160
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE 'request_reopened'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "notifications" WHERE "type" = 'request_reopened'
    `);
  }
}
