import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "news" ADD COLUMN "cover_video_id" integer;
  ALTER TABLE "_news_v" ADD COLUMN "version_cover_video_id" integer;
  ALTER TABLE "news" ADD CONSTRAINT "news_cover_video_id_media_id_fk" FOREIGN KEY ("cover_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_cover_video_id_media_id_fk" FOREIGN KEY ("version_cover_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "news_cover_video_idx" ON "news" USING btree ("cover_video_id");
  CREATE INDEX "_news_v_version_version_cover_video_idx" ON "_news_v" USING btree ("version_cover_video_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "news" DROP CONSTRAINT "news_cover_video_id_media_id_fk";
  
  ALTER TABLE "_news_v" DROP CONSTRAINT "_news_v_version_cover_video_id_media_id_fk";
  
  DROP INDEX "news_cover_video_idx";
  DROP INDEX "_news_v_version_version_cover_video_idx";
  ALTER TABLE "news" DROP COLUMN "cover_video_id";
  ALTER TABLE "_news_v" DROP COLUMN "version_cover_video_id";`)
}
