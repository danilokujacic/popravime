import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFaqItems1787395703121 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "faq_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "category" text NOT NULL,
        "sort_order" integer NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_faq_items_category_sort_order" ON "faq_items" ("category", "sort_order")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "faq_items"`);
  }
}
