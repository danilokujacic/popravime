import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillProviderGalleryStorageKey1787395703241 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "provider_gallery"
      SET "storage_key" = regexp_replace("image_url", '^.*/', '')
      WHERE "storage_key" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "provider_gallery"
      ALTER COLUMN "storage_key" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_gallery"
      ALTER COLUMN "storage_key" DROP NOT NULL
    `);
  }
}
