import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfferCancelledNotificationType1789600211159
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE 'offer_cancelled'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "notifications" WHERE "type" = 'offer_cancelled'
    `);
  }
}
