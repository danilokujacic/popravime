import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfferAcceptedConfirmationNotificationType1787395703311 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE 'offer_accepted_confirmation'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres has no "DROP VALUE" for enums — see
    // 1787395703301-add-new-repair-request-notification-type.ts's down() for the same tradeoff.
    await queryRunner.query(`
      DELETE FROM "notifications" WHERE "type" = 'offer_accepted_confirmation'
    `);
  }
}
