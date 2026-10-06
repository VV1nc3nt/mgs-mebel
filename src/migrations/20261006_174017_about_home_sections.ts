import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "about" ADD COLUMN "hero_cta_label" varchar;
  ALTER TABLE "about" ADD COLUMN "news_label" varchar;
  ALTER TABLE "about" ADD COLUMN "news_title" varchar;
  ALTER TABLE "about" ADD COLUMN "salons_label" varchar;
  ALTER TABLE "about" ADD COLUMN "salons_title" varchar;
  ALTER TABLE "about" ADD COLUMN "works_label" varchar;
  ALTER TABLE "about" ADD COLUMN "works_title" varchar;
  ALTER TABLE "about" ADD COLUMN "works_button_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_hero_cta_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_news_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_news_title" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_salons_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_salons_title" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_works_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_works_title" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_works_button_label" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "about" DROP COLUMN "hero_cta_label";
  ALTER TABLE "about" DROP COLUMN "news_label";
  ALTER TABLE "about" DROP COLUMN "news_title";
  ALTER TABLE "about" DROP COLUMN "salons_label";
  ALTER TABLE "about" DROP COLUMN "salons_title";
  ALTER TABLE "about" DROP COLUMN "works_label";
  ALTER TABLE "about" DROP COLUMN "works_title";
  ALTER TABLE "about" DROP COLUMN "works_button_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_hero_cta_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_news_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_news_title";
  ALTER TABLE "_about_v" DROP COLUMN "version_salons_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_salons_title";
  ALTER TABLE "_about_v" DROP COLUMN "version_works_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_works_title";
  ALTER TABLE "_about_v" DROP COLUMN "version_works_button_label";`)
}
