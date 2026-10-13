import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "catalogs" ADD COLUMN "render_id" integer;
  ALTER TABLE "catalogs" ADD CONSTRAINT "catalogs_render_id_media_id_fk" FOREIGN KEY ("render_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "catalogs_render_idx" ON "catalogs" USING btree ("render_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "catalogs" DROP CONSTRAINT "catalogs_render_id_media_id_fk";
  
  DROP INDEX "catalogs_render_idx";
  ALTER TABLE "catalogs" DROP COLUMN "render_id";`)
}
