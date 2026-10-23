import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "works_page" ADD COLUMN "project_cta_title" varchar;
  ALTER TABLE "works_page" ADD COLUMN "project_cta_text" varchar;
  ALTER TABLE "works_page" ADD COLUMN "project_cta_button" varchar;
  ALTER TABLE "_works_page_v" ADD COLUMN "version_project_cta_title" varchar;
  ALTER TABLE "_works_page_v" ADD COLUMN "version_project_cta_text" varchar;
  ALTER TABLE "_works_page_v" ADD COLUMN "version_project_cta_button" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "works_page" DROP COLUMN "project_cta_title";
  ALTER TABLE "works_page" DROP COLUMN "project_cta_text";
  ALTER TABLE "works_page" DROP COLUMN "project_cta_button";
  ALTER TABLE "_works_page_v" DROP COLUMN "version_project_cta_title";
  ALTER TABLE "_works_page_v" DROP COLUMN "version_project_cta_text";
  ALTER TABLE "_works_page_v" DROP COLUMN "version_project_cta_button";`)
}
