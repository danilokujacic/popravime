import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNewRepairRequestNotificationType1787395703301 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE 'new_repair_request'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres has no "DROP VALUE" for enums — the type can't be cleanly shrunk back without
    // recreating it. Delete the rows using the value instead, so at least no data references a
    // value this rollback claims no longer exists; the value itself stays in the enum type.
    await queryRunner.query(`
      DELETE FROM "notifications" WHERE "type" = 'new_repair_request'
    `);
  }
}
