import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRepairRequestsAcceptedOfferFk1787395703051 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "repair_requests"
      ADD COLUMN "accepted_offer_id" uuid REFERENCES "offers" ("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "repair_requests" DROP COLUMN "accepted_offer_id"
    `);
  }
}
