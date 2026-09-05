import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRepairRequestModeration1787395703261 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "request_status_enum" ADD VALUE 'pending_review'
    `);
    await queryRunner.query(`
      ALTER TYPE "request_status_enum" ADD VALUE 'rejected'
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ALTER COLUMN "customer_id" DROP NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ADD COLUMN "name" text
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ADD COLUMN "contact_email" text
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ADD COLUMN "contact_phone" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "repair_requests" SET "status" = 'open' WHERE "status" = 'pending_review'
    `);
    await queryRunner.query(`
      UPDATE "repair_requests" SET "status" = 'cancelled' WHERE "status" = 'rejected'
    `);
    await queryRunner.query(`
      DELETE FROM "repair_requests" WHERE "customer_id" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" DROP COLUMN "contact_phone"
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" DROP COLUMN "contact_email"
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" DROP COLUMN "name"
    `);
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ALTER COLUMN "customer_id" SET NOT NULL
    `);
  }
}
