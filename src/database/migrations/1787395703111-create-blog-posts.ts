import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlogPosts1787395703111 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "blog_posts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "author_id" uuid NOT NULL REFERENCES "users" ("id"),
        "title" text NOT NULL,
        "slug" text NOT NULL UNIQUE,
        "content" text NOT NULL,
        "cover_image_url" text,
        "tags" text[] NOT NULL DEFAULT '{}',
        "published_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_blog_posts_author_id" ON "blog_posts" ("author_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_blog_posts_published_at" ON "blog_posts" ("published_at") WHERE "published_at" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "blog_posts"`);
  }
}
