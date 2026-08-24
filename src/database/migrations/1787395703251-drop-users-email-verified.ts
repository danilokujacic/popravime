import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUsersEmailVerified1787395703251 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "email_verified"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false
    `);
  }
}
