import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetRepairRequestPendingReviewDefault1787395703262 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ALTER COLUMN "status" SET DEFAULT 'pending_review'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "repair_requests" ALTER COLUMN "status" SET DEFAULT 'open'
    `);
  }
}
