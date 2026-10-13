import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "designers_projects_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"meta" varchar,
  	"video_id" integer,
  	"poster_id" integer,
  	"hidden" boolean DEFAULT false
  );
  
  CREATE TABLE "_designers_v_version_projects_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"meta" varchar,
  	"video_id" integer,
  	"poster_id" integer,
  	"hidden" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  ALTER TABLE "designers" DROP CONSTRAINT "designers_project_video_id_media_id_fk";
  
  ALTER TABLE "designers" DROP CONSTRAINT "designers_project_poster_id_media_id_fk";
  
  ALTER TABLE "_designers_v" DROP CONSTRAINT "_designers_v_version_project_video_id_media_id_fk";
  
  ALTER TABLE "_designers_v" DROP CONSTRAINT "_designers_v_version_project_poster_id_media_id_fk";
  
  DROP INDEX "designers_project_project_video_idx";
  DROP INDEX "designers_project_project_poster_idx";
  DROP INDEX "_designers_v_version_project_version_project_video_idx";
  DROP INDEX "_designers_v_version_project_version_project_poster_idx";
  ALTER TABLE "designers" ADD COLUMN "projects_label" varchar;
  ALTER TABLE "designers" ADD COLUMN "projects_title" varchar;
  ALTER TABLE "_designers_v" ADD COLUMN "version_projects_label" varchar;
  ALTER TABLE "_designers_v" ADD COLUMN "version_projects_title" varchar;
  ALTER TABLE "designers_projects_items" ADD CONSTRAINT "designers_projects_items_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers_projects_items" ADD CONSTRAINT "designers_projects_items_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers_projects_items" ADD CONSTRAINT "designers_projects_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."designers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_designers_v_version_projects_items" ADD CONSTRAINT "_designers_v_version_projects_items_video_id_media_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v_version_projects_items" ADD CONSTRAINT "_designers_v_version_projects_items_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v_version_projects_items" ADD CONSTRAINT "_designers_v_version_projects_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_designers_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "designers_projects_items_order_idx" ON "designers_projects_items" USING btree ("_order");
  CREATE INDEX "designers_projects_items_parent_id_idx" ON "designers_projects_items" USING btree ("_parent_id");
  CREATE INDEX "designers_projects_items_video_idx" ON "designers_projects_items" USING btree ("video_id");
  CREATE INDEX "designers_projects_items_poster_idx" ON "designers_projects_items" USING btree ("poster_id");
  CREATE INDEX "_designers_v_version_projects_items_order_idx" ON "_designers_v_version_projects_items" USING btree ("_order");
  CREATE INDEX "_designers_v_version_projects_items_parent_id_idx" ON "_designers_v_version_projects_items" USING btree ("_parent_id");
  CREATE INDEX "_designers_v_version_projects_items_video_idx" ON "_designers_v_version_projects_items" USING btree ("video_id");
  CREATE INDEX "_designers_v_version_projects_items_poster_idx" ON "_designers_v_version_projects_items" USING btree ("poster_id");
  ALTER TABLE "designers" DROP COLUMN "project_label";
  ALTER TABLE "designers" DROP COLUMN "project_title";
  ALTER TABLE "designers" DROP COLUMN "project_video_id";
  ALTER TABLE "designers" DROP COLUMN "project_poster_id";
  ALTER TABLE "designers" DROP COLUMN "project_caption";
  ALTER TABLE "designers" DROP COLUMN "project_subcaption";
  ALTER TABLE "_designers_v" DROP COLUMN "version_project_label";
  ALTER TABLE "_designers_v" DROP COLUMN "version_project_title";
  ALTER TABLE "_designers_v" DROP COLUMN "version_project_video_id";
  ALTER TABLE "_designers_v" DROP COLUMN "version_project_poster_id";
  ALTER TABLE "_designers_v" DROP COLUMN "version_project_caption";
  ALTER TABLE "_designers_v" DROP COLUMN "version_project_subcaption";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "designers_projects_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_designers_v_version_projects_items" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "designers_projects_items" CASCADE;
  DROP TABLE "_designers_v_version_projects_items" CASCADE;
  ALTER TABLE "designers" ADD COLUMN "project_label" varchar;
  ALTER TABLE "designers" ADD COLUMN "project_title" varchar;
  ALTER TABLE "designers" ADD COLUMN "project_video_id" integer;
  ALTER TABLE "designers" ADD COLUMN "project_poster_id" integer;
  ALTER TABLE "designers" ADD COLUMN "project_caption" varchar;
  ALTER TABLE "designers" ADD COLUMN "project_subcaption" varchar;
  ALTER TABLE "_designers_v" ADD COLUMN "version_project_label" varchar;
  ALTER TABLE "_designers_v" ADD COLUMN "version_project_title" varchar;
  ALTER TABLE "_designers_v" ADD COLUMN "version_project_video_id" integer;
  ALTER TABLE "_designers_v" ADD COLUMN "version_project_poster_id" integer;
  ALTER TABLE "_designers_v" ADD COLUMN "version_project_caption" varchar;
  ALTER TABLE "_designers_v" ADD COLUMN "version_project_subcaption" varchar;
  ALTER TABLE "designers" ADD CONSTRAINT "designers_project_video_id_media_id_fk" FOREIGN KEY ("project_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "designers" ADD CONSTRAINT "designers_project_poster_id_media_id_fk" FOREIGN KEY ("project_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v" ADD CONSTRAINT "_designers_v_version_project_video_id_media_id_fk" FOREIGN KEY ("version_project_video_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_designers_v" ADD CONSTRAINT "_designers_v_version_project_poster_id_media_id_fk" FOREIGN KEY ("version_project_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "designers_project_project_video_idx" ON "designers" USING btree ("project_video_id");
  CREATE INDEX "designers_project_project_poster_idx" ON "designers" USING btree ("project_poster_id");
  CREATE INDEX "_designers_v_version_project_version_project_video_idx" ON "_designers_v" USING btree ("version_project_video_id");
  CREATE INDEX "_designers_v_version_project_version_project_poster_idx" ON "_designers_v" USING btree ("version_project_poster_id");
  ALTER TABLE "designers" DROP COLUMN "projects_label";
  ALTER TABLE "designers" DROP COLUMN "projects_title";
  ALTER TABLE "_designers_v" DROP COLUMN "version_projects_label";
  ALTER TABLE "_designers_v" DROP COLUMN "version_projects_title";`)
}
