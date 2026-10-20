import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Additive: newsPage → «Статья: поделиться» → «Шаблон ссылки MAX» (nullable; empty — no MAX button).

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "news_page" ADD COLUMN "article_share_max_template" varchar;
  ALTER TABLE "_news_page_v" ADD COLUMN "version_article_share_max_template" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "news_page" DROP COLUMN "article_share_max_template";
  ALTER TABLE "_news_page_v" DROP COLUMN "version_article_share_max_template";`)
}
