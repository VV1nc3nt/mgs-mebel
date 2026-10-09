import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "salons_page" ADD COLUMN "map_empty_text" varchar DEFAULT 'Скоро откроемся';
  ALTER TABLE "_salons_page_v" ADD COLUMN "version_map_empty_text" varchar DEFAULT 'Скоро откроемся';
  ALTER TABLE "salons_page" DROP COLUMN "reviews_label";
  ALTER TABLE "salons_page" DROP COLUMN "reviews_title";
  ALTER TABLE "_salons_page_v" DROP COLUMN "version_reviews_label";
  ALTER TABLE "_salons_page_v" DROP COLUMN "version_reviews_title";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "salons_page" ADD COLUMN "reviews_label" varchar;
  ALTER TABLE "salons_page" ADD COLUMN "reviews_title" varchar;
  ALTER TABLE "_salons_page_v" ADD COLUMN "version_reviews_label" varchar;
  ALTER TABLE "_salons_page_v" ADD COLUMN "version_reviews_title" varchar;
  ALTER TABLE "salons_page" DROP COLUMN "map_empty_text";
  ALTER TABLE "_salons_page_v" DROP COLUMN "version_map_empty_text";`)
}
