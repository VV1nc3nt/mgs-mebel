import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * «Наши работы» v2: a project is an address, its items (new `items` collection, «Изделия») go to
 * the feeds by type.
 * - projects: drops category / area / duration / description / order and the slides table (the old
 *   viewer model); adds city, year, complex, cover, about, price, designer, hidden, videos
 *   (`projects_rels`) and `_order` (drag-and-drop order of the admin list).
 * - items: new tables `items`, `items_extra_specs`, `items_rels` (photos, videos).
 * - media: `poster_id` — the poster of a video.
 * - worksPage: drops the viewer button label, adds «Цена актуальна на» (`prices_price_date`).
 * Old projects keep title / slug / place but leave the site (no items); the seed removes the demo
 * ones. Rows without `_order` get it at the first drag in the admin list.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_items_type" AS ENUM('kitchens', 'livingrooms', 'bathrooms', 'hallways', 'wardrobes', 'bedrooms', 'kids');
  CREATE TABLE "projects_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "items_extra_specs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"label" varchar,
  	"type" "enum_items_type" NOT NULL,
  	"title" varchar,
  	"project_id" integer,
  	"place" varchar,
  	"description" varchar,
  	"specs_korpus" varchar DEFAULT 'ЛДСП Egger 18 мм',
  	"specs_fasady" varchar,
  	"specs_furn" varchar DEFAULT 'Blum',
  	"price" numeric,
  	"cta_label" varchar,
  	"featured" boolean DEFAULT false,
  	"hidden" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "items_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  ALTER TABLE "projects_slides" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "projects_slides" CASCADE;
  ALTER TABLE "projects" ADD COLUMN "_order" varchar;
  ALTER TABLE "projects" ADD COLUMN "city" varchar DEFAULT 'Москва';
  ALTER TABLE "projects" ADD COLUMN "year" numeric;
  ALTER TABLE "projects" ADD COLUMN "complex" boolean DEFAULT false;
  ALTER TABLE "projects" ADD COLUMN "cover_id" integer;
  ALTER TABLE "projects" ADD COLUMN "about" varchar;
  ALTER TABLE "projects" ADD COLUMN "price" numeric;
  ALTER TABLE "projects" ADD COLUMN "designer" varchar;
  ALTER TABLE "projects" ADD COLUMN "hidden" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "poster_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "items_id" integer;
  ALTER TABLE "works_page" ADD COLUMN "prices_price_date" varchar;
  ALTER TABLE "_works_page_v" ADD COLUMN "version_prices_price_date" varchar;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_rels" ADD CONSTRAINT "projects_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "items_extra_specs" ADD CONSTRAINT "items_extra_specs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "items" ADD CONSTRAINT "items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "items_rels" ADD CONSTRAINT "items_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "items_rels" ADD CONSTRAINT "items_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "projects_rels_order_idx" ON "projects_rels" USING btree ("order");
  CREATE INDEX "projects_rels_parent_idx" ON "projects_rels" USING btree ("parent_id");
  CREATE INDEX "projects_rels_path_idx" ON "projects_rels" USING btree ("path");
  CREATE INDEX "projects_rels_media_id_idx" ON "projects_rels" USING btree ("media_id");
  CREATE INDEX "items_extra_specs_order_idx" ON "items_extra_specs" USING btree ("_order");
  CREATE INDEX "items_extra_specs_parent_id_idx" ON "items_extra_specs" USING btree ("_parent_id");
  CREATE INDEX "items__order_idx" ON "items" USING btree ("_order");
  CREATE INDEX "items_project_idx" ON "items" USING btree ("project_id");
  CREATE INDEX "items_updated_at_idx" ON "items" USING btree ("updated_at");
  CREATE INDEX "items_created_at_idx" ON "items" USING btree ("created_at");
  CREATE INDEX "items_rels_order_idx" ON "items_rels" USING btree ("order");
  CREATE INDEX "items_rels_parent_idx" ON "items_rels" USING btree ("parent_id");
  CREATE INDEX "items_rels_path_idx" ON "items_rels" USING btree ("path");
  CREATE INDEX "items_rels_media_id_idx" ON "items_rels" USING btree ("media_id");
  ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_items_fk" FOREIGN KEY ("items_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "projects__order_idx" ON "projects" USING btree ("_order");
  CREATE INDEX "projects_cover_idx" ON "projects" USING btree ("cover_id");
  CREATE INDEX "media_poster_idx" ON "media" USING btree ("poster_id");
  CREATE INDEX "payload_locked_documents_rels_items_id_idx" ON "payload_locked_documents_rels" USING btree ("items_id");
  ALTER TABLE "projects" DROP COLUMN "category";
  ALTER TABLE "projects" DROP COLUMN "area";
  ALTER TABLE "projects" DROP COLUMN "duration";
  ALTER TABLE "projects" DROP COLUMN "description";
  ALTER TABLE "projects" DROP COLUMN "order";
  ALTER TABLE "works_page" DROP COLUMN "viewer_cta_label";
  ALTER TABLE "_works_page_v" DROP COLUMN "version_viewer_cta_label";
  DROP TYPE "public"."enum_projects_slides_type";
  DROP TYPE "public"."enum_projects_category";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_projects_slides_type" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_projects_category" AS ENUM('complex', 'kitchens', 'hallways', 'bedrooms', 'bathrooms', 'wardrobes', 'livingrooms');
  CREATE TABLE "projects_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_projects_slides_type" DEFAULT 'photo' NOT NULL,
  	"file_id" integer NOT NULL,
  	"poster_id" integer,
  	"duration" numeric
  );
  
  ALTER TABLE "projects_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "items_extra_specs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "items_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "projects_rels" CASCADE;
  DROP TABLE "items_extra_specs" CASCADE;
  DROP TABLE "items" CASCADE;
  DROP TABLE "items_rels" CASCADE;
  ALTER TABLE "projects" DROP CONSTRAINT "projects_cover_id_media_id_fk";
  
  ALTER TABLE "media" DROP CONSTRAINT "media_poster_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_items_fk";
  
  DROP INDEX "projects__order_idx";
  DROP INDEX "projects_cover_idx";
  DROP INDEX "media_poster_idx";
  DROP INDEX "payload_locked_documents_rels_items_id_idx";
  ALTER TABLE "projects" ADD COLUMN "category" "enum_projects_category" DEFAULT 'complex' NOT NULL;
  ALTER TABLE "projects" ALTER COLUMN "category" DROP DEFAULT;
  ALTER TABLE "projects" ADD COLUMN "area" numeric;
  ALTER TABLE "projects" ADD COLUMN "duration" varchar;
  ALTER TABLE "projects" ADD COLUMN "description" varchar;
  ALTER TABLE "projects" ADD COLUMN "order" numeric;
  ALTER TABLE "works_page" ADD COLUMN "viewer_cta_label" varchar;
  ALTER TABLE "_works_page_v" ADD COLUMN "version_viewer_cta_label" varchar;
  ALTER TABLE "projects_slides" ADD CONSTRAINT "projects_slides_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_slides" ADD CONSTRAINT "projects_slides_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "projects_slides" ADD CONSTRAINT "projects_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "projects_slides_order_idx" ON "projects_slides" USING btree ("_order");
  CREATE INDEX "projects_slides_parent_id_idx" ON "projects_slides" USING btree ("_parent_id");
  CREATE INDEX "projects_slides_file_idx" ON "projects_slides" USING btree ("file_id");
  CREATE INDEX "projects_slides_poster_idx" ON "projects_slides" USING btree ("poster_id");
  ALTER TABLE "projects" DROP COLUMN "_order";
  ALTER TABLE "projects" DROP COLUMN "city";
  ALTER TABLE "projects" DROP COLUMN "year";
  ALTER TABLE "projects" DROP COLUMN "complex";
  ALTER TABLE "projects" DROP COLUMN "cover_id";
  ALTER TABLE "projects" DROP COLUMN "about";
  ALTER TABLE "projects" DROP COLUMN "price";
  ALTER TABLE "projects" DROP COLUMN "designer";
  ALTER TABLE "projects" DROP COLUMN "hidden";
  ALTER TABLE "media" DROP COLUMN "poster_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "items_id";
  ALTER TABLE "works_page" DROP COLUMN "prices_price_date";
  ALTER TABLE "_works_page_v" DROP COLUMN "version_prices_price_date";
  DROP TYPE "public"."enum_items_type";`)
}
