import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1787395703151 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id" uuid REFERENCES "users" ("id"),
        "action" text NOT NULL,
        "entity_type" text NOT NULL,
        "entity_id" uuid NOT NULL,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_entity_type_entity_id" ON "audit_logs" ("entity_type", "entity_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_actor_id_created_at" ON "audit_logs" ("actor_id", "created_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
