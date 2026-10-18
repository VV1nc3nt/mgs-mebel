import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_news_v" ADD COLUMN "autosave" boolean;
  CREATE INDEX "_news_v_autosave_idx" ON "_news_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "_news_v_autosave_idx";
  ALTER TABLE "_news_v" DROP COLUMN "autosave";`)
}
