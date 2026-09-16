import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfferCancelledStatus1789599978635
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "offer_status_enum" ADD VALUE 'cancelled'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres has no "DROP VALUE" for enums — see
    // 1787395703301-add-new-repair-request-notification-type.ts's down() for the same tradeoff.
    await queryRunner.query(`
      DELETE FROM "offers" WHERE "status" = 'cancelled'
    `);
  }
}
