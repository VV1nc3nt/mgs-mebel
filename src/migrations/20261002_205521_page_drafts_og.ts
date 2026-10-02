import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_home_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__home_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_about_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__about_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_salons_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__salons_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_works_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__works_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_catalogs_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__catalogs_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_designers_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__designers_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_news_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "_home_v_version_history_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_home_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_label" varchar,
  	"version_hero_title" varchar,
  	"version_hero_text" varchar,
  	"version_hero_cta_label" varchar,
  	"version_hero_video_id" integer,
  	"version_hero_poster_id" integer,
  	"version_history_label" varchar,
  	"version_history_photo_main_id" integer,
  	"version_history_year_value" varchar,
  	"version_history_year_caption" varchar,
  	"version_history_photo_secondary_id" integer,
  	"version_history_lead" varchar,
  	"version_history_text" varchar,
  	"version_history_link_label" varchar,
  	"version_news_label" varchar,
  	"version_news_title" varchar,
  	"version_salons_label" varchar,
  	"version_salons_title" varchar,
  	"version_works_label" varchar,
  	"version_works_title" varchar,
  	"version_works_button_label" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__home_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
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
  
  CREATE TABLE "_about_v_version_exhibitions_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"title" varchar,
  	"text" varchar,
  	"video_id" integer,
  	"poster_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_label" varchar,
  	"version_hero_title" varchar,
  	"version_hero_text" varchar,
  	"version_hero_video_id" integer,
  	"version_hero_poster_id" integer,
  	"version_history_label" varchar,
  	"version_history_photo_main_id" integer,
  	"version_history_year_value" varchar,
  	"version_history_year_caption" varchar,
  	"version_history_photo_secondary_id" integer,
  	"version_history_lead" varchar,
  	"version_history_text" varchar,
  	"version_mission_label" varchar,
  	"version_mission_title" varchar,
  	"version_mission_video_id" integer,
  	"version_mission_poster_id" integer,
  	"version_hardware_label" varchar,
  	"version_hardware_title" varchar,
  	"version_hardware_text" varchar,
  	"version_hardware_warranty_value" varchar,
  	"version_hardware_warranty_unit" varchar,
  	"version_hardware_warranty_text" varchar,
  	"version_hardware_quality_word" varchar,
  	"version_exhibitions_label" varchar,
  	"version_exhibitions_title" varchar,
  	"version_exhibitions_text" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__about_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_salons_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_label" varchar,
  	"version_hero_title" varchar,
  	"version_hero_lead" varchar,
  	"version_map_list_caption" varchar,
  	"version_map_card_cta_label" varchar,
  	"version_reviews_label" varchar,
  	"version_reviews_title" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__salons_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_works_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_label" varchar,
  	"version_hero_title" varchar,
  	"version_viewer_cta_label" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__works_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_catalogs_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_label" varchar,
  	"version_hero_title" varchar,
  	"version_hero_lead" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__catalogs_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_designers_v_version_hero_audiences" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_designers_v_version_capabilities_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_designers_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_label" varchar,
  	"version_hero_title" varchar,
  	"version_hero_text" varchar,
  	"version_hero_video_id" integer,
  	"version_hero_poster_id" integer,
  	"version_capabilities_label" varchar,
  	"version_capabilities_title" varchar,
  	"version_project_label" varchar,
  	"version_project_title" varchar,
  	"version_project_video_id" integer,
  	"version_project_poster_id" integer,
  	"version_project_caption" varchar,
  	"version_project_subcaption" varchar,
  	"version_cooperation_label" varchar,
  	"version_cooperation_title" varchar,
  	"version_cooperation_messengers_label" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__designers_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_news_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_label" varchar,
  	"version_hero_title" varchar,
  	"version_article_cta_title" varchar,
  	"version_article_cta_text" varchar,
  	"version_article_cta_primary_label" varchar,
  	"version_article_cta_secondary_label" varchar,
  	"version_related_title" varchar,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__news_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "home_history_values" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "home" ALTER COLUMN "hero_title" DROP NOT NULL;
  ALTER TABLE "home" ALTER COLUMN "hero_poster_id" DROP NOT NULL;
  ALTER TABLE "home" ALTER COLUMN "history_photo_main_id" DROP NOT NULL;
  ALTER TABLE "about_history_values" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "about_hardware_items" ALTER COLUMN "photo_id" DROP NOT NULL;
  ALTER TABLE "about_hardware_items" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "about_exhibitions_items" ALTER COLUMN "date" DROP NOT NULL;
  ALTER TABLE "about_exhibitions_items" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "about_exhibitions_items" ALTER COLUMN "poster_id" DROP NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "hero_title" DROP NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "hero_poster_id" DROP NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "history_photo_main_id" DROP NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "mission_poster_id" DROP NOT NULL;
  ALTER TABLE "salons_page" ALTER COLUMN "hero_title" DROP NOT NULL;
  ALTER TABLE "works_page" ALTER COLUMN "hero_title" DROP NOT NULL;
  ALTER TABLE "catalogs_page" ALTER COLUMN "hero_title" DROP NOT NULL;
  ALTER TABLE "designers_hero_audiences" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "designers_capabilities_items" ALTER COLUMN "photo_id" DROP NOT NULL;
  ALTER TABLE "designers_capabilities_items" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "designers" ALTER COLUMN "hero_title" DROP NOT NULL;
  ALTER TABLE "designers" ALTER COLUMN "hero_poster_id" DROP NOT NULL;
  ALTER TABLE "designers" ALTER COLUMN "project_poster_id" DROP NOT NULL;
  ALTER TABLE "news_page" ALTER COLUMN "hero_title" DROP NOT NULL;
  ALTER TABLE "media" ADD COLUMN "sizes_og_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_og_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_og_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_og_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_og_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_og_filename" varchar;
  ALTER TABLE "home" ADD COLUMN "_status" "enum_home_status" DEFAULT 'draft';
  ALTER TABLE "about" ADD COLUMN "_status" "enum_about_status" DEFAULT 'draft';
  ALTER TABLE "salons_page" ADD COLUMN "_status" "enum_salons_page_status" DEFAULT 'draft';
  ALTER TABLE "works_page" ADD COLUMN "_status" "enum_works_page_status" DEFAULT 'draft';
  ALTER TABLE "catalogs_page" ADD COLUMN "_status" "enum_catalogs_page_status" DEFAULT 'draft';
  ALTER TABLE "designers" ADD COLUMN "_status" "enum_designers_status" DEFAULT 'draft';
  ALTER TABLE "news_page" ADD COLUMN "_status" "enum_news_page_status" DEFAULT 'draft';
  ALTER TABLE "_home_v_version_history_values" ADD CONSTRAINT "_home_v_version_history_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_home_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_video_id_media_id_fk" FOREIGN KEY ("version_hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_hero_poster_id_media_id_fk" FOREIGN KEY ("version_hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_history_photo_main_id_media_id_fk" FOREIGN KEY ("version_history_photo_main_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_history_photo_secondary_id_media_id_fk" FOREIGN KEY ("version_history_photo_secondary_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_home_v" ADD CONSTRAINT "_home_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_history_values" ADD CONSTRAINT "_about_v_version_history_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_hardware_items" ADD CONSTRAINT "_about_v_version_hardware_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_hardware_items" ADD CONSTRAINT "_about_v_version_hardware_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v_version_exhibitions_items" ADD CONSTRAINT "_about_v_version_exhibitions_items_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_exhibitions_items" ADD CONSTRAINT "_about_v_version_exhibitions_items_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_exhibitions_items" ADD CONSTRAINT "_about_v_version_exhibitions_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_hero_video_id_media_id_fk" FOREIGN KEY ("version_hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_hero_poster_id_media_id_fk" FOREIGN KEY ("version_hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_history_photo_main_id_media_id_fk" FOREIGN KEY ("version_history_photo_main_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_history_photo_secondary_id_media_id_fk" FOREIGN KEY ("version_history_photo_secondary_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_mission_video_id_media_id_fk" FOREIGN KEY ("version_mission_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_mission_poster_id_media_id_fk" FOREIGN KEY ("version_mission_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_salons_page_v" ADD CONSTRAINT "_salons_page_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_works_page_v" ADD CONSTRAINT "_works_page_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_catalogs_page_v" ADD CONSTRAINT "_catalogs_page_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v_version_hero_audiences" ADD CONSTRAINT "_designers_v_version_hero_audiences_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_designers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designers_v_version_capabilities_items" ADD CONSTRAINT "_designers_v_version_capabilities_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v_version_capabilities_items" ADD CONSTRAINT "_designers_v_version_capabilities_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_designers_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designers_v" ADD CONSTRAINT "_designers_v_version_hero_video_id_media_id_fk" FOREIGN KEY ("version_hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v" ADD CONSTRAINT "_designers_v_version_hero_poster_id_media_id_fk" FOREIGN KEY ("version_hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v" ADD CONSTRAINT "_designers_v_version_project_video_id_media_id_fk" FOREIGN KEY ("version_project_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v" ADD CONSTRAINT "_designers_v_version_project_poster_id_media_id_fk" FOREIGN KEY ("version_project_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v" ADD CONSTRAINT "_designers_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_page_v" ADD CONSTRAINT "_news_page_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "_home_v_version_history_values_order_idx" ON "_home_v_version_history_values" USING btree ("_order");
  CREATE INDEX "_home_v_version_history_values_parent_id_idx" ON "_home_v_version_history_values" USING btree ("_parent_id");
  CREATE INDEX "_home_v_version_hero_version_hero_video_idx" ON "_home_v" USING btree ("version_hero_video_id");
  CREATE INDEX "_home_v_version_hero_version_hero_poster_idx" ON "_home_v" USING btree ("version_hero_poster_id");
  CREATE INDEX "_home_v_version_history_version_history_photo_main_idx" ON "_home_v" USING btree ("version_history_photo_main_id");
  CREATE INDEX "_home_v_version_history_version_history_photo_secondary_idx" ON "_home_v" USING btree ("version_history_photo_secondary_id");
  CREATE INDEX "_home_v_version_meta_version_meta_image_idx" ON "_home_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_home_v_version_version__status_idx" ON "_home_v" USING btree ("version__status");
  CREATE INDEX "_home_v_created_at_idx" ON "_home_v" USING btree ("created_at");
  CREATE INDEX "_home_v_updated_at_idx" ON "_home_v" USING btree ("updated_at");
  CREATE INDEX "_home_v_latest_idx" ON "_home_v" USING btree ("latest");
  CREATE INDEX "_home_v_autosave_idx" ON "_home_v" USING btree ("autosave");
  CREATE INDEX "_about_v_version_history_values_order_idx" ON "_about_v_version_history_values" USING btree ("_order");
  CREATE INDEX "_about_v_version_history_values_parent_id_idx" ON "_about_v_version_history_values" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_hardware_items_order_idx" ON "_about_v_version_hardware_items" USING btree ("_order");
  CREATE INDEX "_about_v_version_hardware_items_parent_id_idx" ON "_about_v_version_hardware_items" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_hardware_items_photo_idx" ON "_about_v_version_hardware_items" USING btree ("photo_id");
  CREATE INDEX "_about_v_version_exhibitions_items_order_idx" ON "_about_v_version_exhibitions_items" USING btree ("_order");
  CREATE INDEX "_about_v_version_exhibitions_items_parent_id_idx" ON "_about_v_version_exhibitions_items" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_exhibitions_items_video_idx" ON "_about_v_version_exhibitions_items" USING btree ("video_id");
  CREATE INDEX "_about_v_version_exhibitions_items_poster_idx" ON "_about_v_version_exhibitions_items" USING btree ("poster_id");
  CREATE INDEX "_about_v_version_hero_version_hero_video_idx" ON "_about_v" USING btree ("version_hero_video_id");
  CREATE INDEX "_about_v_version_hero_version_hero_poster_idx" ON "_about_v" USING btree ("version_hero_poster_id");
  CREATE INDEX "_about_v_version_history_version_history_photo_main_idx" ON "_about_v" USING btree ("version_history_photo_main_id");
  CREATE INDEX "_about_v_version_history_version_history_photo_secondary_idx" ON "_about_v" USING btree ("version_history_photo_secondary_id");
  CREATE INDEX "_about_v_version_mission_version_mission_video_idx" ON "_about_v" USING btree ("version_mission_video_id");
  CREATE INDEX "_about_v_version_mission_version_mission_poster_idx" ON "_about_v" USING btree ("version_mission_poster_id");
  CREATE INDEX "_about_v_version_meta_version_meta_image_idx" ON "_about_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_about_v_version_version__status_idx" ON "_about_v" USING btree ("version__status");
  CREATE INDEX "_about_v_created_at_idx" ON "_about_v" USING btree ("created_at");
  CREATE INDEX "_about_v_updated_at_idx" ON "_about_v" USING btree ("updated_at");
  CREATE INDEX "_about_v_latest_idx" ON "_about_v" USING btree ("latest");
  CREATE INDEX "_about_v_autosave_idx" ON "_about_v" USING btree ("autosave");
  CREATE INDEX "_salons_page_v_version_meta_version_meta_image_idx" ON "_salons_page_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_salons_page_v_version_version__status_idx" ON "_salons_page_v" USING btree ("version__status");
  CREATE INDEX "_salons_page_v_created_at_idx" ON "_salons_page_v" USING btree ("created_at");
  CREATE INDEX "_salons_page_v_updated_at_idx" ON "_salons_page_v" USING btree ("updated_at");
  CREATE INDEX "_salons_page_v_latest_idx" ON "_salons_page_v" USING btree ("latest");
  CREATE INDEX "_salons_page_v_autosave_idx" ON "_salons_page_v" USING btree ("autosave");
  CREATE INDEX "_works_page_v_version_meta_version_meta_image_idx" ON "_works_page_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_works_page_v_version_version__status_idx" ON "_works_page_v" USING btree ("version__status");
  CREATE INDEX "_works_page_v_created_at_idx" ON "_works_page_v" USING btree ("created_at");
  CREATE INDEX "_works_page_v_updated_at_idx" ON "_works_page_v" USING btree ("updated_at");
  CREATE INDEX "_works_page_v_latest_idx" ON "_works_page_v" USING btree ("latest");
  CREATE INDEX "_works_page_v_autosave_idx" ON "_works_page_v" USING btree ("autosave");
  CREATE INDEX "_catalogs_page_v_version_meta_version_meta_image_idx" ON "_catalogs_page_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_catalogs_page_v_version_version__status_idx" ON "_catalogs_page_v" USING btree ("version__status");
  CREATE INDEX "_catalogs_page_v_created_at_idx" ON "_catalogs_page_v" USING btree ("created_at");
  CREATE INDEX "_catalogs_page_v_updated_at_idx" ON "_catalogs_page_v" USING btree ("updated_at");
  CREATE INDEX "_catalogs_page_v_latest_idx" ON "_catalogs_page_v" USING btree ("latest");
  CREATE INDEX "_catalogs_page_v_autosave_idx" ON "_catalogs_page_v" USING btree ("autosave");
  CREATE INDEX "_designers_v_version_hero_audiences_order_idx" ON "_designers_v_version_hero_audiences" USING btree ("_order");
  CREATE INDEX "_designers_v_version_hero_audiences_parent_id_idx" ON "_designers_v_version_hero_audiences" USING btree ("_parent_id");
  CREATE INDEX "_designers_v_version_capabilities_items_order_idx" ON "_designers_v_version_capabilities_items" USING btree ("_order");
  CREATE INDEX "_designers_v_version_capabilities_items_parent_id_idx" ON "_designers_v_version_capabilities_items" USING btree ("_parent_id");
  CREATE INDEX "_designers_v_version_capabilities_items_photo_idx" ON "_designers_v_version_capabilities_items" USING btree ("photo_id");
  CREATE INDEX "_designers_v_version_hero_version_hero_video_idx" ON "_designers_v" USING btree ("version_hero_video_id");
  CREATE INDEX "_designers_v_version_hero_version_hero_poster_idx" ON "_designers_v" USING btree ("version_hero_poster_id");
  CREATE INDEX "_designers_v_version_project_version_project_video_idx" ON "_designers_v" USING btree ("version_project_video_id");
  CREATE INDEX "_designers_v_version_project_version_project_poster_idx" ON "_designers_v" USING btree ("version_project_poster_id");
  CREATE INDEX "_designers_v_version_meta_version_meta_image_idx" ON "_designers_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_designers_v_version_version__status_idx" ON "_designers_v" USING btree ("version__status");
  CREATE INDEX "_designers_v_created_at_idx" ON "_designers_v" USING btree ("created_at");
  CREATE INDEX "_designers_v_updated_at_idx" ON "_designers_v" USING btree ("updated_at");
  CREATE INDEX "_designers_v_latest_idx" ON "_designers_v" USING btree ("latest");
  CREATE INDEX "_designers_v_autosave_idx" ON "_designers_v" USING btree ("autosave");
  CREATE INDEX "_news_page_v_version_meta_version_meta_image_idx" ON "_news_page_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_news_page_v_version_version__status_idx" ON "_news_page_v" USING btree ("version__status");
  CREATE INDEX "_news_page_v_created_at_idx" ON "_news_page_v" USING btree ("created_at");
  CREATE INDEX "_news_page_v_updated_at_idx" ON "_news_page_v" USING btree ("updated_at");
  CREATE INDEX "_news_page_v_latest_idx" ON "_news_page_v" USING btree ("latest");
  CREATE INDEX "_news_page_v_autosave_idx" ON "_news_page_v" USING btree ("autosave");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE INDEX "home__status_idx" ON "home" USING btree ("_status");
  CREATE INDEX "about__status_idx" ON "about" USING btree ("_status");
  CREATE INDEX "salons_page__status_idx" ON "salons_page" USING btree ("_status");
  CREATE INDEX "works_page__status_idx" ON "works_page" USING btree ("_status");
  CREATE INDEX "catalogs_page__status_idx" ON "catalogs_page" USING btree ("_status");
  CREATE INDEX "designers__status_idx" ON "designers" USING btree ("_status");
  CREATE INDEX "news_page__status_idx" ON "news_page" USING btree ("_status");`)

  // Page globals saved before drafts existed were live: keep them published. The new column
  // defaults to 'draft', which would hide them from the site and anonymous API reads.
  await db.execute(sql`
   UPDATE "home" SET "_status" = 'published';
  UPDATE "about" SET "_status" = 'published';
  UPDATE "salons_page" SET "_status" = 'published';
  UPDATE "works_page" SET "_status" = 'published';
  UPDATE "catalogs_page" SET "_status" = 'published';
  UPDATE "designers" SET "_status" = 'published';
  UPDATE "news_page" SET "_status" = 'published';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_home_v_version_history_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_home_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_about_v_version_history_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_about_v_version_hardware_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_about_v_version_exhibitions_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_about_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_salons_page_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_works_page_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_catalogs_page_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_designers_v_version_hero_audiences" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_designers_v_version_capabilities_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_designers_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_page_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_home_v_version_history_values" CASCADE;
  DROP TABLE "_home_v" CASCADE;
  DROP TABLE "_about_v_version_history_values" CASCADE;
  DROP TABLE "_about_v_version_hardware_items" CASCADE;
  DROP TABLE "_about_v_version_exhibitions_items" CASCADE;
  DROP TABLE "_about_v" CASCADE;
  DROP TABLE "_salons_page_v" CASCADE;
  DROP TABLE "_works_page_v" CASCADE;
  DROP TABLE "_catalogs_page_v" CASCADE;
  DROP TABLE "_designers_v_version_hero_audiences" CASCADE;
  DROP TABLE "_designers_v_version_capabilities_items" CASCADE;
  DROP TABLE "_designers_v" CASCADE;
  DROP TABLE "_news_page_v" CASCADE;
  DROP INDEX "media_sizes_og_sizes_og_filename_idx";
  DROP INDEX "home__status_idx";
  DROP INDEX "about__status_idx";
  DROP INDEX "salons_page__status_idx";
  DROP INDEX "works_page__status_idx";
  DROP INDEX "catalogs_page__status_idx";
  DROP INDEX "designers__status_idx";
  DROP INDEX "news_page__status_idx";
  ALTER TABLE "home_history_values" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "home" ALTER COLUMN "hero_title" SET NOT NULL;
  ALTER TABLE "home" ALTER COLUMN "hero_poster_id" SET NOT NULL;
  ALTER TABLE "home" ALTER COLUMN "history_photo_main_id" SET NOT NULL;
  ALTER TABLE "about_history_values" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "about_hardware_items" ALTER COLUMN "photo_id" SET NOT NULL;
  ALTER TABLE "about_hardware_items" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "about_exhibitions_items" ALTER COLUMN "date" SET NOT NULL;
  ALTER TABLE "about_exhibitions_items" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "about_exhibitions_items" ALTER COLUMN "poster_id" SET NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "hero_title" SET NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "hero_poster_id" SET NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "history_photo_main_id" SET NOT NULL;
  ALTER TABLE "about" ALTER COLUMN "mission_poster_id" SET NOT NULL;
  ALTER TABLE "salons_page" ALTER COLUMN "hero_title" SET NOT NULL;
  ALTER TABLE "works_page" ALTER COLUMN "hero_title" SET NOT NULL;
  ALTER TABLE "catalogs_page" ALTER COLUMN "hero_title" SET NOT NULL;
  ALTER TABLE "designers_hero_audiences" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "designers_capabilities_items" ALTER COLUMN "photo_id" SET NOT NULL;
  ALTER TABLE "designers_capabilities_items" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "designers" ALTER COLUMN "hero_title" SET NOT NULL;
  ALTER TABLE "designers" ALTER COLUMN "hero_poster_id" SET NOT NULL;
  ALTER TABLE "designers" ALTER COLUMN "project_poster_id" SET NOT NULL;
  ALTER TABLE "news_page" ALTER COLUMN "hero_title" SET NOT NULL;
  ALTER TABLE "media" DROP COLUMN "sizes_og_url";
  ALTER TABLE "media" DROP COLUMN "sizes_og_width";
  ALTER TABLE "media" DROP COLUMN "sizes_og_height";
  ALTER TABLE "media" DROP COLUMN "sizes_og_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_og_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_og_filename";
  ALTER TABLE "home" DROP COLUMN "_status";
  ALTER TABLE "about" DROP COLUMN "_status";
  ALTER TABLE "salons_page" DROP COLUMN "_status";
  ALTER TABLE "works_page" DROP COLUMN "_status";
  ALTER TABLE "catalogs_page" DROP COLUMN "_status";
  ALTER TABLE "designers" DROP COLUMN "_status";
  ALTER TABLE "news_page" DROP COLUMN "_status";
  DROP TYPE "public"."enum_home_status";
  DROP TYPE "public"."enum__home_v_version_status";
  DROP TYPE "public"."enum_about_status";
  DROP TYPE "public"."enum__about_v_version_status";
  DROP TYPE "public"."enum_salons_page_status";
  DROP TYPE "public"."enum__salons_page_v_version_status";
  DROP TYPE "public"."enum_works_page_status";
  DROP TYPE "public"."enum__works_page_v_version_status";
  DROP TYPE "public"."enum_catalogs_page_status";
  DROP TYPE "public"."enum__catalogs_page_v_version_status";
  DROP TYPE "public"."enum_designers_status";
  DROP TYPE "public"."enum__designers_v_version_status";
  DROP TYPE "public"."enum_news_page_status";
  DROP TYPE "public"."enum__news_page_v_version_status";`)
}
