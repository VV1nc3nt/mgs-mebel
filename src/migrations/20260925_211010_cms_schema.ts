import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_slides_type" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_projects_category" AS ENUM('complex', 'kitchens', 'hallways', 'bedrooms', 'bathrooms', 'wardrobes', 'livingrooms');
  CREATE TYPE "public"."enum_news_blocks_media_ratio" AS ENUM('3x2', '4x5', '1x1', '16x9');
  CREATE TYPE "public"."enum_news_type" AS ENUM('news', 'new');
  CREATE TYPE "public"."enum_news_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__news_v_blocks_media_ratio" AS ENUM('3x2', '4x5', '1x1', '16x9');
  CREATE TYPE "public"."enum__news_v_version_type" AS ENUM('news', 'new');
  CREATE TYPE "public"."enum__news_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_catalogs_category" AS ENUM('kitchens', 'wardrobes', 'facades', 'bathrooms', 'tables');
  CREATE TYPE "public"."enum_users_role" AS ENUM('developer', 'admin', 'manager', 'content');
  CREATE TABLE "projects_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_projects_slides_type" DEFAULT 'photo' NOT NULL,
  	"file_id" integer NOT NULL,
  	"poster_id" integer,
  	"duration" numeric
  );
  
  CREATE TABLE "projects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"category" "enum_projects_category" NOT NULL,
  	"place" varchar,
  	"area" numeric,
  	"duration" varchar,
  	"description" varchar,
  	"featured" boolean DEFAULT false,
  	"order" numeric,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "news_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_heading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "news_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"author" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"caption" varchar,
  	"ratio" "enum_news_blocks_media_ratio",
  	"wide" boolean,
  	"block_name" varchar
  );
  
  CREATE TABLE "news_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"embed_url" varchar,
  	"poster_id" integer,
  	"duration" varchar,
  	"vertical" boolean,
  	"wide" boolean,
  	"caption" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "news" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"type" "enum_news_type" DEFAULT 'news',
  	"date" timestamp(3) with time zone,
  	"lead" varchar,
  	"cover_id" integer,
  	"reading_time" numeric,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_news_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "news_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "_news_v_blocks_paragraph" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_heading" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_news_v_blocks_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"author" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"caption" varchar,
  	"ratio" "enum__news_v_blocks_media_ratio",
  	"wide" boolean,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v_blocks_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"file_id" integer,
  	"embed_url" varchar,
  	"poster_id" integer,
  	"duration" varchar,
  	"vertical" boolean,
  	"wide" boolean,
  	"caption" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_news_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_type" "enum__news_v_version_type" DEFAULT 'news',
  	"version_date" timestamp(3) with time zone,
  	"version_lead" varchar,
  	"version_cover_id" integer,
  	"version_reading_time" numeric,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__news_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_news_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "salons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"address" varchar NOT NULL,
  	"phone" varchar,
  	"metro" varchar,
  	"hours" varchar,
  	"location_lat" numeric,
  	"location_lng" numeric,
  	"review_video_id" integer,
  	"poster_id" integer,
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "catalogs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"category" "enum_catalogs_category" NOT NULL,
  	"cover_id" integer NOT NULL,
  	"pdf_id" integer NOT NULL,
  	"pages" numeric,
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "home_history_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_label" varchar,
  	"hero_title" varchar NOT NULL,
  	"hero_text" varchar,
  	"hero_cta_label" varchar,
  	"hero_video_id" integer,
  	"hero_poster_id" integer NOT NULL,
  	"history_label" varchar,
  	"history_photo_main_id" integer NOT NULL,
  	"history_year_value" varchar,
  	"history_year_caption" varchar,
  	"history_photo_secondary_id" integer,
  	"history_lead" varchar,
  	"history_text" varchar,
  	"history_link_label" varchar,
  	"news_label" varchar,
  	"news_title" varchar,
  	"salons_label" varchar,
  	"salons_title" varchar,
  	"works_label" varchar,
  	"works_title" varchar,
  	"works_button_label" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_history_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "about_hardware_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" integer NOT NULL,
  	"title" varchar NOT NULL
  );
  
  CREATE TABLE "about_exhibitions_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"video_id" integer,
  	"poster_id" integer NOT NULL
  );
  
  CREATE TABLE "about" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_label" varchar,
  	"hero_title" varchar NOT NULL,
  	"hero_text" varchar,
  	"hero_video_id" integer,
  	"hero_poster_id" integer NOT NULL,
  	"history_label" varchar,
  	"history_photo_main_id" integer NOT NULL,
  	"history_year_value" varchar,
  	"history_year_caption" varchar,
  	"history_photo_secondary_id" integer,
  	"history_lead" varchar,
  	"history_text" varchar,
  	"mission_label" varchar,
  	"mission_title" varchar,
  	"mission_video_id" integer,
  	"mission_poster_id" integer NOT NULL,
  	"hardware_label" varchar,
  	"hardware_title" varchar,
  	"hardware_text" varchar,
  	"hardware_warranty_value" varchar,
  	"hardware_warranty_unit" varchar,
  	"hardware_warranty_text" varchar,
  	"hardware_quality_word" varchar,
  	"exhibitions_label" varchar,
  	"exhibitions_title" varchar,
  	"exhibitions_text" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "salons_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_label" varchar,
  	"hero_title" varchar NOT NULL,
  	"hero_lead" varchar,
  	"map_list_caption" varchar,
  	"map_card_cta_label" varchar,
  	"reviews_label" varchar,
  	"reviews_title" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "works_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_label" varchar,
  	"hero_title" varchar NOT NULL,
  	"viewer_cta_label" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "catalogs_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_label" varchar,
  	"hero_title" varchar NOT NULL,
  	"hero_lead" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "designers_hero_audiences" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "designers_capabilities_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "designers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_label" varchar,
  	"hero_title" varchar NOT NULL,
  	"hero_text" varchar,
  	"hero_video_id" integer,
  	"hero_poster_id" integer NOT NULL,
  	"capabilities_label" varchar,
  	"capabilities_title" varchar,
  	"project_label" varchar,
  	"project_title" varchar,
  	"project_video_id" integer,
  	"project_poster_id" integer NOT NULL,
  	"project_caption" varchar,
  	"project_subcaption" varchar,
  	"cooperation_label" varchar,
  	"cooperation_title" varchar,
  	"cooperation_messengers_label" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "news_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_label" varchar,
  	"hero_title" varchar NOT NULL,
  	"article_cta_title" varchar,
  	"article_cta_text" varchar,
  	"article_cta_primary_label" varchar,
  	"article_cta_secondary_label" varchar,
  	"related_title" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "layout" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"header_cta_label" varchar,
  	"nav_about_label" varchar NOT NULL,
  	"nav_about_short_label" varchar,
  	"nav_salons_label" varchar NOT NULL,
  	"nav_salons_short_label" varchar,
  	"nav_works_label" varchar NOT NULL,
  	"nav_works_short_label" varchar,
  	"nav_catalogs_label" varchar NOT NULL,
  	"nav_catalogs_short_label" varchar,
  	"nav_designers_label" varchar NOT NULL,
  	"nav_designers_short_label" varchar,
  	"nav_news_label" varchar NOT NULL,
  	"nav_news_short_label" varchar,
  	"menu_hotline_label" varchar,
  	"menu_messengers_label" varchar,
  	"dock_ask_label" varchar NOT NULL,
  	"footer_slogan_text" varchar,
  	"footer_slogan_accent" varchar,
  	"footer_hotline_label" varchar,
  	"footer_copyright" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"contacts_hotline_phone" varchar NOT NULL,
  	"contacts_email" varchar,
  	"messengers_max" varchar,
  	"messengers_whatsapp" varchar,
  	"messengers_telegram" varchar,
  	"designer_manager_photo_id" integer,
  	"designer_manager_name" varchar,
  	"designer_manager_position" varchar,
  	"designer_manager_phone" varchar,
  	"designer_manager_max" varchar,
  	"designer_manager_whatsapp" varchar,
  	"designer_manager_telegram" varchar,
  	"technical_consultant_widget_code" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "media" ALTER COLUMN "alt" DROP NOT NULL;
  ALTER TABLE "media" ALTER COLUMN "prefix" SET DEFAULT 'media';
  ALTER TABLE "users" ADD COLUMN "role" "enum_users_role" DEFAULT 'content' NOT NULL;
  -- Users created before roles existed (the staging owner) become developers.
  UPDATE "users" SET "role" = 'developer';
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "projects_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "news_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "salons_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "catalogs_id" integer;
  ALTER TABLE "projects_slides" ADD CONSTRAINT "projects_slides_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_slides" ADD CONSTRAINT "projects_slides_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_slides" ADD CONSTRAINT "projects_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects" ADD CONSTRAINT "projects_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_blocks_paragraph" ADD CONSTRAINT "news_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_heading" ADD CONSTRAINT "news_blocks_heading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_list_items" ADD CONSTRAINT "news_blocks_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_list" ADD CONSTRAINT "news_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_quote" ADD CONSTRAINT "news_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_media" ADD CONSTRAINT "news_blocks_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_blocks_video" ADD CONSTRAINT "news_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_blocks_video" ADD CONSTRAINT "news_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_blocks_video" ADD CONSTRAINT "news_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news" ADD CONSTRAINT "news_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_rels" ADD CONSTRAINT "news_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "news_rels" ADD CONSTRAINT "news_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_paragraph" ADD CONSTRAINT "_news_v_blocks_paragraph_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_heading" ADD CONSTRAINT "_news_v_blocks_heading_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_list_items" ADD CONSTRAINT "_news_v_blocks_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v_blocks_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_list" ADD CONSTRAINT "_news_v_blocks_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_quote" ADD CONSTRAINT "_news_v_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_media" ADD CONSTRAINT "_news_v_blocks_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_video" ADD CONSTRAINT "_news_v_blocks_video_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_video" ADD CONSTRAINT "_news_v_blocks_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_blocks_video" ADD CONSTRAINT "_news_v_blocks_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_parent_id_news_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."news"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v" ADD CONSTRAINT "_news_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_news_v_rels" ADD CONSTRAINT "_news_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_news_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_news_v_rels" ADD CONSTRAINT "_news_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "salons" ADD CONSTRAINT "salons_review_video_id_media_id_fk" FOREIGN KEY ("review_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "salons" ADD CONSTRAINT "salons_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalogs" ADD CONSTRAINT "catalogs_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalogs" ADD CONSTRAINT "catalogs_pdf_id_media_id_fk" FOREIGN KEY ("pdf_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home_history_values" ADD CONSTRAINT "home_history_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_video_id_media_id_fk" FOREIGN KEY ("hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_hero_poster_id_media_id_fk" FOREIGN KEY ("hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_history_photo_main_id_media_id_fk" FOREIGN KEY ("history_photo_main_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_history_photo_secondary_id_media_id_fk" FOREIGN KEY ("history_photo_secondary_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "home" ADD CONSTRAINT "home_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_history_values" ADD CONSTRAINT "about_history_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_hardware_items" ADD CONSTRAINT "about_hardware_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_hardware_items" ADD CONSTRAINT "about_hardware_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_exhibitions_items" ADD CONSTRAINT "about_exhibitions_items_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_exhibitions_items" ADD CONSTRAINT "about_exhibitions_items_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_exhibitions_items" ADD CONSTRAINT "about_exhibitions_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_hero_video_id_media_id_fk" FOREIGN KEY ("hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_hero_poster_id_media_id_fk" FOREIGN KEY ("hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_history_photo_main_id_media_id_fk" FOREIGN KEY ("history_photo_main_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_history_photo_secondary_id_media_id_fk" FOREIGN KEY ("history_photo_secondary_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_mission_video_id_media_id_fk" FOREIGN KEY ("mission_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_mission_poster_id_media_id_fk" FOREIGN KEY ("mission_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "salons_page" ADD CONSTRAINT "salons_page_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "works_page" ADD CONSTRAINT "works_page_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "catalogs_page" ADD CONSTRAINT "catalogs_page_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers_hero_audiences" ADD CONSTRAINT "designers_hero_audiences_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."designers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "designers_capabilities_items" ADD CONSTRAINT "designers_capabilities_items_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers_capabilities_items" ADD CONSTRAINT "designers_capabilities_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."designers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "designers" ADD CONSTRAINT "designers_hero_video_id_media_id_fk" FOREIGN KEY ("hero_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers" ADD CONSTRAINT "designers_hero_poster_id_media_id_fk" FOREIGN KEY ("hero_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers" ADD CONSTRAINT "designers_project_video_id_media_id_fk" FOREIGN KEY ("project_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers" ADD CONSTRAINT "designers_project_poster_id_media_id_fk" FOREIGN KEY ("project_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers" ADD CONSTRAINT "designers_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "news_page" ADD CONSTRAINT "news_page_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stats_items" ADD CONSTRAINT "stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings" ADD CONSTRAINT "settings_designer_manager_photo_id_media_id_fk" FOREIGN KEY ("designer_manager_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "projects_slides_order_idx" ON "projects_slides" USING btree ("_order");
  CREATE INDEX "projects_slides_parent_id_idx" ON "projects_slides" USING btree ("_parent_id");
  CREATE INDEX "projects_slides_file_idx" ON "projects_slides" USING btree ("file_id");
  CREATE INDEX "projects_slides_poster_idx" ON "projects_slides" USING btree ("poster_id");
  CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("slug");
  CREATE INDEX "projects_meta_meta_image_idx" ON "projects" USING btree ("meta_image_id");
  CREATE INDEX "projects_updated_at_idx" ON "projects" USING btree ("updated_at");
  CREATE INDEX "projects_created_at_idx" ON "projects" USING btree ("created_at");
  CREATE INDEX "news_blocks_paragraph_order_idx" ON "news_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "news_blocks_paragraph_parent_id_idx" ON "news_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_paragraph_path_idx" ON "news_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "news_blocks_heading_order_idx" ON "news_blocks_heading" USING btree ("_order");
  CREATE INDEX "news_blocks_heading_parent_id_idx" ON "news_blocks_heading" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_heading_path_idx" ON "news_blocks_heading" USING btree ("_path");
  CREATE INDEX "news_blocks_list_items_order_idx" ON "news_blocks_list_items" USING btree ("_order");
  CREATE INDEX "news_blocks_list_items_parent_id_idx" ON "news_blocks_list_items" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_list_order_idx" ON "news_blocks_list" USING btree ("_order");
  CREATE INDEX "news_blocks_list_parent_id_idx" ON "news_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_list_path_idx" ON "news_blocks_list" USING btree ("_path");
  CREATE INDEX "news_blocks_quote_order_idx" ON "news_blocks_quote" USING btree ("_order");
  CREATE INDEX "news_blocks_quote_parent_id_idx" ON "news_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_quote_path_idx" ON "news_blocks_quote" USING btree ("_path");
  CREATE INDEX "news_blocks_media_order_idx" ON "news_blocks_media" USING btree ("_order");
  CREATE INDEX "news_blocks_media_parent_id_idx" ON "news_blocks_media" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_media_path_idx" ON "news_blocks_media" USING btree ("_path");
  CREATE INDEX "news_blocks_video_order_idx" ON "news_blocks_video" USING btree ("_order");
  CREATE INDEX "news_blocks_video_parent_id_idx" ON "news_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "news_blocks_video_path_idx" ON "news_blocks_video" USING btree ("_path");
  CREATE INDEX "news_blocks_video_file_idx" ON "news_blocks_video" USING btree ("file_id");
  CREATE INDEX "news_blocks_video_poster_idx" ON "news_blocks_video" USING btree ("poster_id");
  CREATE UNIQUE INDEX "news_slug_idx" ON "news" USING btree ("slug");
  CREATE INDEX "news_cover_idx" ON "news" USING btree ("cover_id");
  CREATE INDEX "news_meta_meta_image_idx" ON "news" USING btree ("meta_image_id");
  CREATE INDEX "news_updated_at_idx" ON "news" USING btree ("updated_at");
  CREATE INDEX "news_created_at_idx" ON "news" USING btree ("created_at");
  CREATE INDEX "news__status_idx" ON "news" USING btree ("_status");
  CREATE INDEX "news_rels_order_idx" ON "news_rels" USING btree ("order");
  CREATE INDEX "news_rels_parent_idx" ON "news_rels" USING btree ("parent_id");
  CREATE INDEX "news_rels_path_idx" ON "news_rels" USING btree ("path");
  CREATE INDEX "news_rels_media_id_idx" ON "news_rels" USING btree ("media_id");
  CREATE INDEX "_news_v_blocks_paragraph_order_idx" ON "_news_v_blocks_paragraph" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_paragraph_parent_id_idx" ON "_news_v_blocks_paragraph" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_paragraph_path_idx" ON "_news_v_blocks_paragraph" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_heading_order_idx" ON "_news_v_blocks_heading" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_heading_parent_id_idx" ON "_news_v_blocks_heading" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_heading_path_idx" ON "_news_v_blocks_heading" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_list_items_order_idx" ON "_news_v_blocks_list_items" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_list_items_parent_id_idx" ON "_news_v_blocks_list_items" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_list_order_idx" ON "_news_v_blocks_list" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_list_parent_id_idx" ON "_news_v_blocks_list" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_list_path_idx" ON "_news_v_blocks_list" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_quote_order_idx" ON "_news_v_blocks_quote" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_quote_parent_id_idx" ON "_news_v_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_quote_path_idx" ON "_news_v_blocks_quote" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_media_order_idx" ON "_news_v_blocks_media" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_media_parent_id_idx" ON "_news_v_blocks_media" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_media_path_idx" ON "_news_v_blocks_media" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_video_order_idx" ON "_news_v_blocks_video" USING btree ("_order");
  CREATE INDEX "_news_v_blocks_video_parent_id_idx" ON "_news_v_blocks_video" USING btree ("_parent_id");
  CREATE INDEX "_news_v_blocks_video_path_idx" ON "_news_v_blocks_video" USING btree ("_path");
  CREATE INDEX "_news_v_blocks_video_file_idx" ON "_news_v_blocks_video" USING btree ("file_id");
  CREATE INDEX "_news_v_blocks_video_poster_idx" ON "_news_v_blocks_video" USING btree ("poster_id");
  CREATE INDEX "_news_v_parent_idx" ON "_news_v" USING btree ("parent_id");
  CREATE INDEX "_news_v_version_version_slug_idx" ON "_news_v" USING btree ("version_slug");
  CREATE INDEX "_news_v_version_version_cover_idx" ON "_news_v" USING btree ("version_cover_id");
  CREATE INDEX "_news_v_version_meta_version_meta_image_idx" ON "_news_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_news_v_version_version_updated_at_idx" ON "_news_v" USING btree ("version_updated_at");
  CREATE INDEX "_news_v_version_version_created_at_idx" ON "_news_v" USING btree ("version_created_at");
  CREATE INDEX "_news_v_version_version__status_idx" ON "_news_v" USING btree ("version__status");
  CREATE INDEX "_news_v_created_at_idx" ON "_news_v" USING btree ("created_at");
  CREATE INDEX "_news_v_updated_at_idx" ON "_news_v" USING btree ("updated_at");
  CREATE INDEX "_news_v_latest_idx" ON "_news_v" USING btree ("latest");
  CREATE INDEX "_news_v_rels_order_idx" ON "_news_v_rels" USING btree ("order");
  CREATE INDEX "_news_v_rels_parent_idx" ON "_news_v_rels" USING btree ("parent_id");
  CREATE INDEX "_news_v_rels_path_idx" ON "_news_v_rels" USING btree ("path");
  CREATE INDEX "_news_v_rels_media_id_idx" ON "_news_v_rels" USING btree ("media_id");
  CREATE INDEX "salons_review_video_idx" ON "salons" USING btree ("review_video_id");
  CREATE INDEX "salons_poster_idx" ON "salons" USING btree ("poster_id");
  CREATE INDEX "salons_updated_at_idx" ON "salons" USING btree ("updated_at");
  CREATE INDEX "salons_created_at_idx" ON "salons" USING btree ("created_at");
  CREATE INDEX "catalogs_cover_idx" ON "catalogs" USING btree ("cover_id");
  CREATE INDEX "catalogs_pdf_idx" ON "catalogs" USING btree ("pdf_id");
  CREATE INDEX "catalogs_updated_at_idx" ON "catalogs" USING btree ("updated_at");
  CREATE INDEX "catalogs_created_at_idx" ON "catalogs" USING btree ("created_at");
  CREATE INDEX "home_history_values_order_idx" ON "home_history_values" USING btree ("_order");
  CREATE INDEX "home_history_values_parent_id_idx" ON "home_history_values" USING btree ("_parent_id");
  CREATE INDEX "home_hero_hero_video_idx" ON "home" USING btree ("hero_video_id");
  CREATE INDEX "home_hero_hero_poster_idx" ON "home" USING btree ("hero_poster_id");
  CREATE INDEX "home_history_history_photo_main_idx" ON "home" USING btree ("history_photo_main_id");
  CREATE INDEX "home_history_history_photo_secondary_idx" ON "home" USING btree ("history_photo_secondary_id");
  CREATE INDEX "home_meta_meta_image_idx" ON "home" USING btree ("meta_image_id");
  CREATE INDEX "about_history_values_order_idx" ON "about_history_values" USING btree ("_order");
  CREATE INDEX "about_history_values_parent_id_idx" ON "about_history_values" USING btree ("_parent_id");
  CREATE INDEX "about_hardware_items_order_idx" ON "about_hardware_items" USING btree ("_order");
  CREATE INDEX "about_hardware_items_parent_id_idx" ON "about_hardware_items" USING btree ("_parent_id");
  CREATE INDEX "about_hardware_items_photo_idx" ON "about_hardware_items" USING btree ("photo_id");
  CREATE INDEX "about_exhibitions_items_order_idx" ON "about_exhibitions_items" USING btree ("_order");
  CREATE INDEX "about_exhibitions_items_parent_id_idx" ON "about_exhibitions_items" USING btree ("_parent_id");
  CREATE INDEX "about_exhibitions_items_video_idx" ON "about_exhibitions_items" USING btree ("video_id");
  CREATE INDEX "about_exhibitions_items_poster_idx" ON "about_exhibitions_items" USING btree ("poster_id");
  CREATE INDEX "about_hero_hero_video_idx" ON "about" USING btree ("hero_video_id");
  CREATE INDEX "about_hero_hero_poster_idx" ON "about" USING btree ("hero_poster_id");
  CREATE INDEX "about_history_history_photo_main_idx" ON "about" USING btree ("history_photo_main_id");
  CREATE INDEX "about_history_history_photo_secondary_idx" ON "about" USING btree ("history_photo_secondary_id");
  CREATE INDEX "about_mission_mission_video_idx" ON "about" USING btree ("mission_video_id");
  CREATE INDEX "about_mission_mission_poster_idx" ON "about" USING btree ("mission_poster_id");
  CREATE INDEX "about_meta_meta_image_idx" ON "about" USING btree ("meta_image_id");
  CREATE INDEX "salons_page_meta_meta_image_idx" ON "salons_page" USING btree ("meta_image_id");
  CREATE INDEX "works_page_meta_meta_image_idx" ON "works_page" USING btree ("meta_image_id");
  CREATE INDEX "catalogs_page_meta_meta_image_idx" ON "catalogs_page" USING btree ("meta_image_id");
  CREATE INDEX "designers_hero_audiences_order_idx" ON "designers_hero_audiences" USING btree ("_order");
  CREATE INDEX "designers_hero_audiences_parent_id_idx" ON "designers_hero_audiences" USING btree ("_parent_id");
  CREATE INDEX "designers_capabilities_items_order_idx" ON "designers_capabilities_items" USING btree ("_order");
  CREATE INDEX "designers_capabilities_items_parent_id_idx" ON "designers_capabilities_items" USING btree ("_parent_id");
  CREATE INDEX "designers_capabilities_items_photo_idx" ON "designers_capabilities_items" USING btree ("photo_id");
  CREATE INDEX "designers_hero_hero_video_idx" ON "designers" USING btree ("hero_video_id");
  CREATE INDEX "designers_hero_hero_poster_idx" ON "designers" USING btree ("hero_poster_id");
  CREATE INDEX "designers_project_project_video_idx" ON "designers" USING btree ("project_video_id");
  CREATE INDEX "designers_project_project_poster_idx" ON "designers" USING btree ("project_poster_id");
  CREATE INDEX "designers_meta_meta_image_idx" ON "designers" USING btree ("meta_image_id");
  CREATE INDEX "news_page_meta_meta_image_idx" ON "news_page" USING btree ("meta_image_id");
  CREATE INDEX "stats_items_order_idx" ON "stats_items" USING btree ("_order");
  CREATE INDEX "stats_items_parent_id_idx" ON "stats_items" USING btree ("_parent_id");
  CREATE INDEX "settings_designer_manager_designer_manager_photo_idx" ON "settings" USING btree ("designer_manager_photo_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_projects_fk" FOREIGN KEY ("projects_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_news_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_salons_fk" FOREIGN KEY ("salons_id") REFERENCES "public"."salons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_catalogs_fk" FOREIGN KEY ("catalogs_id") REFERENCES "public"."catalogs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_projects_id_idx" ON "payload_locked_documents_rels" USING btree ("projects_id");
  CREATE INDEX "payload_locked_documents_rels_news_id_idx" ON "payload_locked_documents_rels" USING btree ("news_id");
  CREATE INDEX "payload_locked_documents_rels_salons_id_idx" ON "payload_locked_documents_rels" USING btree ("salons_id");
  CREATE INDEX "payload_locked_documents_rels_catalogs_id_idx" ON "payload_locked_documents_rels" USING btree ("catalogs_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_paragraph" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_heading" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_paragraph" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_heading" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_quote" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_blocks_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_news_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "salons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalogs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home_history_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "home" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_history_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_hardware_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about_exhibitions_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "about" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "salons_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "works_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "catalogs_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "designers_hero_audiences" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "designers_capabilities_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "designers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "news_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "layout" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "settings" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "projects_slides" CASCADE;
  DROP TABLE "projects" CASCADE;
  DROP TABLE "news_blocks_paragraph" CASCADE;
  DROP TABLE "news_blocks_heading" CASCADE;
  DROP TABLE "news_blocks_list_items" CASCADE;
  DROP TABLE "news_blocks_list" CASCADE;
  DROP TABLE "news_blocks_quote" CASCADE;
  DROP TABLE "news_blocks_media" CASCADE;
  DROP TABLE "news_blocks_video" CASCADE;
  DROP TABLE "news" CASCADE;
  DROP TABLE "news_rels" CASCADE;
  DROP TABLE "_news_v_blocks_paragraph" CASCADE;
  DROP TABLE "_news_v_blocks_heading" CASCADE;
  DROP TABLE "_news_v_blocks_list_items" CASCADE;
  DROP TABLE "_news_v_blocks_list" CASCADE;
  DROP TABLE "_news_v_blocks_quote" CASCADE;
  DROP TABLE "_news_v_blocks_media" CASCADE;
  DROP TABLE "_news_v_blocks_video" CASCADE;
  DROP TABLE "_news_v" CASCADE;
  DROP TABLE "_news_v_rels" CASCADE;
  DROP TABLE "salons" CASCADE;
  DROP TABLE "catalogs" CASCADE;
  DROP TABLE "home_history_values" CASCADE;
  DROP TABLE "home" CASCADE;
  DROP TABLE "about_history_values" CASCADE;
  DROP TABLE "about_hardware_items" CASCADE;
  DROP TABLE "about_exhibitions_items" CASCADE;
  DROP TABLE "about" CASCADE;
  DROP TABLE "salons_page" CASCADE;
  DROP TABLE "works_page" CASCADE;
  DROP TABLE "catalogs_page" CASCADE;
  DROP TABLE "designers_hero_audiences" CASCADE;
  DROP TABLE "designers_capabilities_items" CASCADE;
  DROP TABLE "designers" CASCADE;
  DROP TABLE "news_page" CASCADE;
  DROP TABLE "stats_items" CASCADE;
  DROP TABLE "stats" CASCADE;
  DROP TABLE "layout" CASCADE;
  DROP TABLE "settings" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_projects_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_news_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_salons_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_catalogs_fk";
  
  DROP INDEX "payload_locked_documents_rels_projects_id_idx";
  DROP INDEX "payload_locked_documents_rels_news_id_idx";
  DROP INDEX "payload_locked_documents_rels_salons_id_idx";
  DROP INDEX "payload_locked_documents_rels_catalogs_id_idx";
  ALTER TABLE "media" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "media" ALTER COLUMN "prefix" SET DEFAULT '';
  ALTER TABLE "users" DROP COLUMN "role";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "projects_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "news_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "salons_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "catalogs_id";
  DROP TYPE "public"."enum_projects_slides_type";
  DROP TYPE "public"."enum_projects_category";
  DROP TYPE "public"."enum_news_blocks_media_ratio";
  DROP TYPE "public"."enum_news_type";
  DROP TYPE "public"."enum_news_status";
  DROP TYPE "public"."enum__news_v_blocks_media_ratio";
  DROP TYPE "public"."enum__news_v_version_type";
  DROP TYPE "public"."enum__news_v_version_status";
  DROP TYPE "public"."enum_catalogs_category";
  DROP TYPE "public"."enum_users_role";`)
}
