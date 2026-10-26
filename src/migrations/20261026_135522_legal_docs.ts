import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_legal_privacy_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__legal_privacy_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_legal_cookies_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__legal_cookies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_legal_offer_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__legal_offer_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "legal_privacy" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"_status" "enum_legal_privacy_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_legal_privacy_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_title" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__legal_privacy_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "legal_cookies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"_status" "enum_legal_cookies_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_legal_cookies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_title" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__legal_cookies_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "legal_offer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"_status" "enum_legal_offer_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_legal_offer_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_title" varchar,
  	"version_body" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version__status" "enum__legal_offer_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "legal_privacy" ADD CONSTRAINT "legal_privacy_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legal_privacy_v" ADD CONSTRAINT "_legal_privacy_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "legal_cookies" ADD CONSTRAINT "legal_cookies_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legal_cookies_v" ADD CONSTRAINT "_legal_cookies_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "legal_offer" ADD CONSTRAINT "legal_offer_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_legal_offer_v" ADD CONSTRAINT "_legal_offer_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "legal_privacy_meta_meta_image_idx" ON "legal_privacy" USING btree ("meta_image_id");
  CREATE INDEX "legal_privacy__status_idx" ON "legal_privacy" USING btree ("_status");
  CREATE INDEX "_legal_privacy_v_version_meta_version_meta_image_idx" ON "_legal_privacy_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_legal_privacy_v_version_version__status_idx" ON "_legal_privacy_v" USING btree ("version__status");
  CREATE INDEX "_legal_privacy_v_created_at_idx" ON "_legal_privacy_v" USING btree ("created_at");
  CREATE INDEX "_legal_privacy_v_updated_at_idx" ON "_legal_privacy_v" USING btree ("updated_at");
  CREATE INDEX "_legal_privacy_v_latest_idx" ON "_legal_privacy_v" USING btree ("latest");
  CREATE INDEX "_legal_privacy_v_autosave_idx" ON "_legal_privacy_v" USING btree ("autosave");
  CREATE INDEX "legal_cookies_meta_meta_image_idx" ON "legal_cookies" USING btree ("meta_image_id");
  CREATE INDEX "legal_cookies__status_idx" ON "legal_cookies" USING btree ("_status");
  CREATE INDEX "_legal_cookies_v_version_meta_version_meta_image_idx" ON "_legal_cookies_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_legal_cookies_v_version_version__status_idx" ON "_legal_cookies_v" USING btree ("version__status");
  CREATE INDEX "_legal_cookies_v_created_at_idx" ON "_legal_cookies_v" USING btree ("created_at");
  CREATE INDEX "_legal_cookies_v_updated_at_idx" ON "_legal_cookies_v" USING btree ("updated_at");
  CREATE INDEX "_legal_cookies_v_latest_idx" ON "_legal_cookies_v" USING btree ("latest");
  CREATE INDEX "_legal_cookies_v_autosave_idx" ON "_legal_cookies_v" USING btree ("autosave");
  CREATE INDEX "legal_offer_meta_meta_image_idx" ON "legal_offer" USING btree ("meta_image_id");
  CREATE INDEX "legal_offer__status_idx" ON "legal_offer" USING btree ("_status");
  CREATE INDEX "_legal_offer_v_version_meta_version_meta_image_idx" ON "_legal_offer_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_legal_offer_v_version_version__status_idx" ON "_legal_offer_v" USING btree ("version__status");
  CREATE INDEX "_legal_offer_v_created_at_idx" ON "_legal_offer_v" USING btree ("created_at");
  CREATE INDEX "_legal_offer_v_updated_at_idx" ON "_legal_offer_v" USING btree ("updated_at");
  CREATE INDEX "_legal_offer_v_latest_idx" ON "_legal_offer_v" USING btree ("latest");
  CREATE INDEX "_legal_offer_v_autosave_idx" ON "_legal_offer_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "legal_privacy" CASCADE;
  DROP TABLE "_legal_privacy_v" CASCADE;
  DROP TABLE "legal_cookies" CASCADE;
  DROP TABLE "_legal_cookies_v" CASCADE;
  DROP TABLE "legal_offer" CASCADE;
  DROP TABLE "_legal_offer_v" CASCADE;
  DROP TYPE "public"."enum_legal_privacy_status";
  DROP TYPE "public"."enum__legal_privacy_v_version_status";
  DROP TYPE "public"."enum_legal_cookies_status";
  DROP TYPE "public"."enum__legal_cookies_v_version_status";
  DROP TYPE "public"."enum_legal_offer_status";
  DROP TYPE "public"."enum__legal_offer_v_version_status";`)
}
