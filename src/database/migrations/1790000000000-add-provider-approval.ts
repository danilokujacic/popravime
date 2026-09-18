import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderApproval1790000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "providers" ADD COLUMN "approved" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`UPDATE "providers" SET "approved" = true`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "providers" DROP COLUMN "approved"`);
  }
}
