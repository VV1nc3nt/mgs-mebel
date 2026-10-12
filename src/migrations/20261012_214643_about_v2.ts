import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "about_history_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_hardware_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_about_v_version_history_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_about_v_version_hardware_items" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "about_history_values" CASCADE;
  DROP TABLE "about_hardware_items" CASCADE;
  DROP TABLE "_about_v_version_history_values" CASCADE;
  DROP TABLE "_about_v_version_hardware_items" CASCADE;
  ALTER TABLE "about" ADD COLUMN "intro_text" varchar;
  ALTER TABLE "about" ADD COLUMN "intro_accent" varchar;
  ALTER TABLE "about" ADD COLUMN "mission_text" varchar;
  ALTER TABLE "about" ADD COLUMN "mission_embed_url" varchar;
  ALTER TABLE "about" ADD COLUMN "mission_duration" varchar;
  ALTER TABLE "about" ADD COLUMN "mission_caption" varchar;
  ALTER TABLE "about" ADD COLUMN "hardware_video_id" integer;
  ALTER TABLE "about" ADD COLUMN "hardware_poster_id" integer;
  ALTER TABLE "about" ADD COLUMN "hardware_caption" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_intro_text" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_intro_accent" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_mission_text" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_mission_embed_url" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_mission_duration" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_mission_caption" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_hardware_video_id" integer;
  ALTER TABLE "_about_v" ADD COLUMN "version_hardware_poster_id" integer;
  ALTER TABLE "_about_v" ADD COLUMN "version_hardware_caption" varchar;
  ALTER TABLE "about" ADD CONSTRAINT "about_hardware_video_id_media_id_fk" FOREIGN KEY ("hardware_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_hardware_poster_id_media_id_fk" FOREIGN KEY ("hardware_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_hardware_video_id_media_id_fk" FOREIGN KEY ("version_hardware_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_hardware_poster_id_media_id_fk" FOREIGN KEY ("version_hardware_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "about_hardware_hardware_video_idx" ON "about" USING btree ("hardware_video_id");
  CREATE INDEX "about_hardware_hardware_poster_idx" ON "about" USING btree ("hardware_poster_id");
  CREATE INDEX "_about_v_version_hardware_version_hardware_video_idx" ON "_about_v" USING btree ("version_hardware_video_id");
  CREATE INDEX "_about_v_version_hardware_version_hardware_poster_idx" ON "_about_v" USING btree ("version_hardware_poster_id");
  ALTER TABLE "about" DROP COLUMN "news_label";
  ALTER TABLE "about" DROP COLUMN "news_title";
  ALTER TABLE "about" DROP COLUMN "salons_label";
  ALTER TABLE "about" DROP COLUMN "salons_title";
  ALTER TABLE "about" DROP COLUMN "works_label";
  ALTER TABLE "about" DROP COLUMN "works_title";
  ALTER TABLE "about" DROP COLUMN "works_button_label";
  ALTER TABLE "about" DROP COLUMN "hardware_warranty_value";
  ALTER TABLE "about" DROP COLUMN "hardware_warranty_unit";
  ALTER TABLE "about" DROP COLUMN "hardware_warranty_text";
  ALTER TABLE "about" DROP COLUMN "hardware_quality_word";
  ALTER TABLE "_about_v" DROP COLUMN "version_news_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_news_title";
  ALTER TABLE "_about_v" DROP COLUMN "version_salons_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_salons_title";
  ALTER TABLE "_about_v" DROP COLUMN "version_works_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_works_title";
  ALTER TABLE "_about_v" DROP COLUMN "version_works_button_label";
  ALTER TABLE "_about_v" DROP COLUMN "version_hardware_warranty_value";
  ALTER TABLE "_about_v" DROP COLUMN "version_hardware_warranty_unit";
  ALTER TABLE "_about_v" DROP COLUMN "version_hardware_warranty_text";
  ALTER TABLE "_about_v" DROP COLUMN "version_hardware_quality_word";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "about_history_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "about_hardware_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"title" varchar
  );
  
  CREATE TABLE "_about_v_version_history_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_v_version_hardware_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"title" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "about" DROP CONSTRAINT "about_hardware_video_id_media_id_fk";
  
  ALTER TABLE "about" DROP CONSTRAINT "about_hardware_poster_id_media_id_fk";
  
  ALTER TABLE "_about_v" DROP CONSTRAINT "_about_v_version_hardware_video_id_media_id_fk";
  
  ALTER TABLE "_about_v" DROP CONSTRAINT "_about_v_version_hardware_poster_id_media_id_fk";
  
  DROP INDEX "about_hardware_hardware_video_idx";
  DROP INDEX "about_hardware_hardware_poster_idx";
  DROP INDEX "_about_v_version_hardware_version_hardware_video_idx";
  DROP INDEX "_about_v_version_hardware_version_hardware_poster_idx";
  ALTER TABLE "about" ADD COLUMN "news_label" varchar;
  ALTER TABLE "about" ADD COLUMN "news_title" varchar;
  ALTER TABLE "about" ADD COLUMN "salons_label" varchar;
  ALTER TABLE "about" ADD COLUMN "salons_title" varchar;
  ALTER TABLE "about" ADD COLUMN "works_label" varchar;
  ALTER TABLE "about" ADD COLUMN "works_title" varchar;
  ALTER TABLE "about" ADD COLUMN "works_button_label" varchar;
  ALTER TABLE "about" ADD COLUMN "hardware_warranty_value" varchar;
  ALTER TABLE "about" ADD COLUMN "hardware_warranty_unit" varchar;
  ALTER TABLE "about" ADD COLUMN "hardware_warranty_text" varchar;
  ALTER TABLE "about" ADD COLUMN "hardware_quality_word" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_news_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_news_title" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_salons_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_salons_title" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_works_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_works_title" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_works_button_label" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_hardware_warranty_value" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_hardware_warranty_unit" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_hardware_warranty_text" varchar;
  ALTER TABLE "_about_v" ADD COLUMN "version_hardware_quality_word" varchar;
  ALTER TABLE "about_history_values" ADD CONSTRAINT "about_history_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_hardware_items" ADD CONSTRAINT "about_hardware_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_hardware_items" ADD CONSTRAINT "about_hardware_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_history_values" ADD CONSTRAINT "_about_v_version_history_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_hardware_items" ADD CONSTRAINT "_about_v_version_hardware_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_hardware_items" ADD CONSTRAINT "_about_v_version_hardware_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "about_history_values_order_idx" ON "about_history_values" USING btree ("_order");
  CREATE INDEX "about_history_values_parent_id_idx" ON "about_history_values" USING btree ("_parent_id");
  CREATE INDEX "about_hardware_items_order_idx" ON "about_hardware_items" USING btree ("_order");
  CREATE INDEX "about_hardware_items_parent_id_idx" ON "about_hardware_items" USING btree ("_parent_id");
  CREATE INDEX "about_hardware_items_photo_idx" ON "about_hardware_items" USING btree ("photo_id");
  CREATE INDEX "_about_v_version_history_values_order_idx" ON "_about_v_version_history_values" USING btree ("_order");
  CREATE INDEX "_about_v_version_history_values_parent_id_idx" ON "_about_v_version_history_values" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_hardware_items_order_idx" ON "_about_v_version_hardware_items" USING btree ("_order");
  CREATE INDEX "_about_v_version_hardware_items_parent_id_idx" ON "_about_v_version_hardware_items" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_hardware_items_photo_idx" ON "_about_v_version_hardware_items" USING btree ("photo_id");
  ALTER TABLE "about" DROP COLUMN "intro_text";
  ALTER TABLE "about" DROP COLUMN "intro_accent";
  ALTER TABLE "about" DROP COLUMN "mission_text";
  ALTER TABLE "about" DROP COLUMN "mission_embed_url";
  ALTER TABLE "about" DROP COLUMN "mission_duration";
  ALTER TABLE "about" DROP COLUMN "mission_caption";
  ALTER TABLE "about" DROP COLUMN "hardware_video_id";
  ALTER TABLE "about" DROP COLUMN "hardware_poster_id";
  ALTER TABLE "about" DROP COLUMN "hardware_caption";
  ALTER TABLE "_about_v" DROP COLUMN "version_intro_text";
  ALTER TABLE "_about_v" DROP COLUMN "version_intro_accent";
  ALTER TABLE "_about_v" DROP COLUMN "version_mission_text";
  ALTER TABLE "_about_v" DROP COLUMN "version_mission_embed_url";
  ALTER TABLE "_about_v" DROP COLUMN "version_mission_duration";
  ALTER TABLE "_about_v" DROP COLUMN "version_mission_caption";
  ALTER TABLE "_about_v" DROP COLUMN "version_hardware_video_id";
  ALTER TABLE "_about_v" DROP COLUMN "version_hardware_poster_id";
  ALTER TABLE "_about_v" DROP COLUMN "version_hardware_caption";`)
}
