import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProviderGallery1787395703021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "provider_gallery" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider_id" uuid NOT NULL REFERENCES "providers" ("id") ON DELETE CASCADE,
        "image_url" text NOT NULL,
        "caption" text,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_provider_gallery_provider_id" ON "provider_gallery" ("provider_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "provider_gallery"`);
  }
}
