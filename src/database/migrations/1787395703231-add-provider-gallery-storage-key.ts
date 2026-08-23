import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderGalleryStorageKey1787395703231 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_gallery"
      ADD COLUMN "storage_key" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "provider_gallery" DROP COLUMN "storage_key"
    `);
  }
}
