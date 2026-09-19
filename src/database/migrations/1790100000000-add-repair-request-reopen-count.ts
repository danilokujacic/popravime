import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRepairRequestReopenCount1790100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "repair_requests"
        ADD COLUMN "reopen_count" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "repair_requests" DROP COLUMN "reopen_count"
    `);
  }
}
