import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "home_hero_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"title" varchar,
  	"text" varchar,
  	"video_id" integer,
  	"poster_id" integer
  );
  
  CREATE TABLE "_home_v_version_hero_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"title" varchar,
  	"text" varchar,
  	"video_id" integer,
  	"poster_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "home_history_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_v_version_history_values" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "home_history_values" CASCADE;
  DROP TABLE "_home_v_version_history_values" CASCADE;
  ALTER TABLE "home" DROP CONSTRAINT "home_hero_video_id_media_id_fk";
  
  ALTER TABLE "home" DROP CONSTRAINT "home_hero_poster_id_media_id_fk";
  
  ALTER TABLE "home" DROP CONSTRAINT "home_history_photo_main_id_media_id_fk";
  
  ALTER TABLE "home" DROP CONSTRAINT "home_history_photo_secondary_id_media_id_fk";
  
  ALTER TABLE "_home_v" DROP CONSTRAINT "_home_v_version_hero_video_id_media_id_fk";
  
  ALTER TABLE "_home_v" DROP CONSTRAINT "_home_v_version_hero_poster_id_media_id_fk";
  
  ALTER TABLE "_home_v" DROP CONSTRAINT "_home_v_version_history_photo_main_id_media_id_fk";
  
  ALTER TABLE "_home_v" DROP CONSTRAINT "_home_v_version_history_photo_secondary_id_media_id_fk";
  
  DROP INDEX "home_hero_hero_video_idx";
  DROP INDEX "home_hero_hero_poster_idx";
  DROP INDEX "home_history_history_photo_main_idx";
  DROP INDEX "home_history_history_photo_secondary_idx";
  DROP INDEX "_home_v_version_hero_version_hero_video_idx";
  DROP INDEX "_home_v_version_hero_version_hero_poster_idx";
  DROP INDEX "_home_v_version_history_version_history_photo_main_idx";
  DROP INDEX "_home_v_version_history_version_history_photo_secondary_idx";
  ALTER TABLE "home" ADD COLUMN "hero_link_label" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_hero_link_label" varchar;
  ALTER TABLE "home_hero_slides" ADD CONSTRAINT "home_hero_slides_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_hero_slides" ADD CONSTRAINT "home_hero_slides_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_hero_slides" ADD CONSTRAINT "home_hero_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_hero_slides" ADD CONSTRAINT "_home_v_version_hero_slides_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v_version_hero_slides" ADD CONSTRAINT "_home_v_version_hero_slides_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v_version_hero_slides" ADD CONSTRAINT "_home_v_version_hero_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_hero_slides_order_idx" ON "home_hero_slides" USING btree ("_order");
  CREATE INDEX "home_hero_slides_parent_id_idx" ON "home_hero_slides" USING btree ("_parent_id");
  CREATE INDEX "home_hero_slides_video_idx" ON "home_hero_slides" USING btree ("video_id");
  CREATE INDEX "home_hero_slides_poster_idx" ON "home_hero_slides" USING btree ("poster_id");
  CREATE INDEX "_home_v_version_hero_slides_order_idx" ON "_home_v_version_hero_slides" USING btree ("_order");
  CREATE INDEX "_home_v_version_hero_slides_parent_id_idx" ON "_home_v_version_hero_slides" USING btree ("_parent_id");
  CREATE INDEX "_home_v_version_hero_slides_video_idx" ON "_home_v_version_hero_slides" USING btree ("video_id");
  CREATE INDEX "_home_v_version_hero_slides_poster_idx" ON "_home_v_version_hero_slides" USING btree ("poster_id");
  `)
  // The single hero of the former home page becomes its first segment (published and the latest
  // version), so the page keeps its hero until the demo data is seeded again.
  await db.execute(sql`
  INSERT INTO "home_hero_slides" ("_order", "_parent_id", "id", "label", "title", "text", "video_id", "poster_id")
    SELECT 1, "id", gen_random_uuid()::text, "hero_label", "hero_title", "hero_text", "hero_video_id", "hero_poster_id"
    FROM "home" WHERE "hero_title" IS NOT NULL;
  INSERT INTO "_home_v_version_hero_slides" ("_order", "_parent_id", "_uuid", "label", "title", "text", "video_id", "poster_id")
    SELECT 1, "id", gen_random_uuid()::text, "version_hero_label", "version_hero_title", "version_hero_text", "version_hero_video_id", "version_hero_poster_id"
    FROM "_home_v" WHERE "latest" AND "version_hero_title" IS NOT NULL;
  `)
  await db.execute(sql`
  ALTER TABLE "home" DROP COLUMN "hero_label";
  ALTER TABLE "home" DROP COLUMN "hero_title";
  ALTER TABLE "home" DROP COLUMN "hero_text";
  ALTER TABLE "home" DROP COLUMN "hero_video_id";
  ALTER TABLE "home" DROP COLUMN "hero_poster_id";
  ALTER TABLE "home" DROP COLUMN "history_label";
  ALTER TABLE "home" DROP COLUMN "history_photo_main_id";
  ALTER TABLE "home" DROP COLUMN "history_year_value";
  ALTER TABLE "home" DROP COLUMN "history_year_caption";
  ALTER TABLE "home" DROP COLUMN "history_photo_secondary_id";
  ALTER TABLE "home" DROP COLUMN "history_lead";
  ALTER TABLE "home" DROP COLUMN "history_text";
  ALTER TABLE "home" DROP COLUMN "history_link_label";
  ALTER TABLE "_home_v" DROP COLUMN "version_hero_label";
  ALTER TABLE "_home_v" DROP COLUMN "version_hero_title";
  ALTER TABLE "_home_v" DROP COLUMN "version_hero_text";
  ALTER TABLE "_home_v" DROP COLUMN "version_hero_video_id";
  ALTER TABLE "_home_v" DROP COLUMN "version_hero_poster_id";
  ALTER TABLE "_home_v" DROP COLUMN "version_history_label";
  ALTER TABLE "_home_v" DROP COLUMN "version_history_photo_main_id";
  ALTER TABLE "_home_v" DROP COLUMN "version_history_year_value";
  ALTER TABLE "_home_v" DROP COLUMN "version_history_year_caption";
  ALTER TABLE "_home_v" DROP COLUMN "version_history_photo_secondary_id";
  ALTER TABLE "_home_v" DROP COLUMN "version_history_lead";
  ALTER TABLE "_home_v" DROP COLUMN "version_history_text";
  ALTER TABLE "_home_v" DROP COLUMN "version_history_link_label";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // The first segment goes back into the single hero; the history of the home page is not restored.
  await db.execute(sql`
  CREATE TABLE "home_v3_first_slides" AS
    SELECT 'home' AS "source", "_parent_id", "label", "title", "text", "video_id", "poster_id"
      FROM "home_hero_slides" WHERE "_order" = 1
    UNION ALL
    SELECT 'version', "_parent_id", "label", "title", "text", "video_id", "poster_id"
      FROM "_home_v_version_hero_slides" WHERE "_order" = 1;
  `)
  await db.execute(sql`
   CREATE TABLE "home_history_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "_home_v_version_history_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "home_hero_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_v_version_hero_slides" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "home_hero_slides" CASCADE;
  DROP TABLE "_home_v_version_hero_slides" CASCADE;
  ALTER TABLE "home" ADD COLUMN "hero_label" varchar;
  ALTER TABLE "home" ADD COLUMN "hero_title" varchar;
  ALTER TABLE "home" ADD COLUMN "hero_text" varchar;
  ALTER TABLE "home" ADD COLUMN "hero_video_id" integer;
  ALTER TABLE "home" ADD COLUMN "hero_poster_id" integer;
  ALTER TABLE "home" ADD COLUMN "history_label" varchar;
  ALTER TABLE "home" ADD COLUMN "history_photo_main_id" integer;
  ALTER TABLE "home" ADD COLUMN "history_year_value" varchar;
  ALTER TABLE "home" ADD COLUMN "history_year_caption" varchar;
  ALTER TABLE "home" ADD COLUMN "history_photo_secondary_id" integer;
  ALTER TABLE "home" ADD COLUMN "history_lead" varchar;
  ALTER TABLE "home" ADD COLUMN "history_text" varchar;
  ALTER TABLE "home" ADD COLUMN "history_link_label" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_hero_label" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_hero_title" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_hero_text" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_hero_video_id" integer;
  ALTER TABLE "_home_v" ADD COLUMN "version_hero_poster_id" integer;
  ALTER TABLE "_home_v" ADD COLUMN "version_history_label" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_history_photo_main_id" integer;
  ALTER TABLE "_home_v" ADD COLUMN "version_history_year_value" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_history_year_caption" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_history_photo_secondary_id" integer;
  ALTER TABLE "_home_v" ADD COLUMN "version_history_lead" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_history_text" varchar;
  ALTER TABLE "_home_v" ADD COLUMN "version_history_link_label" varchar;
  ALTER TABLE "home_history_values" ADD CONSTRAINT "home_history_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v_version_history_values" ADD CONSTRAINT "_home_v_version_history_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_history_values_order_idx" ON "home_history_values" USING btree ("_order");
  CREATE INDEX "home_history_values_parent_id_idx" ON "home_history_values" USING btree ("_parent_id");
  CREATE INDEX "_home_v_version_history_values_order_idx" ON "_home_v_version_history_values" USING btree ("_order");
  CREATE INDEX "_home_v_version_history_values_parent_id_idx" ON "_home_v_version_history_values" USING btree ("_parent_id");
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_video_id_media_id_fk" FOREIGN KEY ("hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_poster_id_media_id_fk" FOREIGN KEY ("hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_history_photo_main_id_media_id_fk" FOREIGN KEY ("history_photo_main_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_history_photo_secondary_id_media_id_fk" FOREIGN KEY ("history_photo_secondary_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_video_id_media_id_fk" FOREIGN KEY ("version_hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_poster_id_media_id_fk" FOREIGN KEY ("version_hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_history_photo_main_id_media_id_fk" FOREIGN KEY ("version_history_photo_main_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_history_photo_secondary_id_media_id_fk" FOREIGN KEY ("version_history_photo_secondary_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "home_hero_hero_video_idx" ON "home" USING btree ("hero_video_id");
  CREATE INDEX "home_hero_hero_poster_idx" ON "home" USING btree ("hero_poster_id");
  CREATE INDEX "home_history_history_photo_main_idx" ON "home" USING btree ("history_photo_main_id");
  CREATE INDEX "home_history_history_photo_secondary_idx" ON "home" USING btree ("history_photo_secondary_id");
  CREATE INDEX "_home_v_version_hero_version_hero_video_idx" ON "_home_v" USING btree ("version_hero_video_id");
  CREATE INDEX "_home_v_version_hero_version_hero_poster_idx" ON "_home_v" USING btree ("version_hero_poster_id");
  CREATE INDEX "_home_v_version_history_version_history_photo_main_idx" ON "_home_v" USING btree ("version_history_photo_main_id");
  CREATE INDEX "_home_v_version_history_version_history_photo_secondary_idx" ON "_home_v" USING btree ("version_history_photo_secondary_id");
  ALTER TABLE "home" DROP COLUMN "hero_link_label";
  ALTER TABLE "_home_v" DROP COLUMN "version_hero_link_label";`)
  await db.execute(sql`
  UPDATE "home" SET "hero_label" = s."label", "hero_title" = s."title", "hero_text" = s."text",
    "hero_video_id" = s."video_id", "hero_poster_id" = s."poster_id"
    FROM "home_v3_first_slides" s WHERE s."source" = 'home' AND s."_parent_id" = "home"."id";
  UPDATE "_home_v" SET "version_hero_label" = s."label", "version_hero_title" = s."title",
    "version_hero_text" = s."text", "version_hero_video_id" = s."video_id",
    "version_hero_poster_id" = s."poster_id"
    FROM "home_v3_first_slides" s WHERE s."source" = 'version' AND s."_parent_id" = "_home_v"."id";
  DROP TABLE "home_v3_first_slides";
  `)
}
