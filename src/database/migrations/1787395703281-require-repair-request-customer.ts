import { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireRepairRequestCustomer1787395703281 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ALTER COLUMN "customer_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" DROP COLUMN "name"
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" DROP COLUMN "contact_email"
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" DROP COLUMN "contact_phone"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ADD COLUMN "name" text
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ADD COLUMN "contact_email" text
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ADD COLUMN "contact_phone" text
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ALTER COLUMN "customer_id" DROP NOT NULL
    `);
  }
}
