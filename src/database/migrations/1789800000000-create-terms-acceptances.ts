import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTermsAcceptances1789800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "terms_acceptances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users" ("id"),
        "version" text NOT NULL,
        "document_hash" text,
        "source" text NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "accepted_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_terms_acceptances_user_id" ON "terms_acceptances" ("user_id", "accepted_at")
    `);
    await queryRunner.query(`
      CREATE FUNCTION "forbid_terms_acceptance_update"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'terms_acceptances is append-only';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "terms_acceptances_no_update"
      BEFORE UPDATE ON "terms_acceptances"
      FOR EACH ROW EXECUTE FUNCTION "forbid_terms_acceptance_update"()
    `);
    await queryRunner.query(`
      INSERT INTO "terms_acceptances" ("user_id", "version", "source", "accepted_at")
      SELECT "id", "terms_version", 'legacy', "terms_accepted_at"
      FROM "users"
      WHERE "terms_version" IS NOT NULL AND "terms_accepted_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER "terms_acceptances_no_update" ON "terms_acceptances"`,
    );
    await queryRunner.query(`DROP FUNCTION "forbid_terms_acceptance_update"()`);
    await queryRunner.query(`DROP TABLE "terms_acceptances"`);
  }
}
