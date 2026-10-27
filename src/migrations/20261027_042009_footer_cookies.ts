import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "layout_footer_buyer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  ALTER TABLE "layout" ADD COLUMN "footer_menu_title" varchar;
  ALTER TABLE "layout" ADD COLUMN "footer_buyers_title" varchar;
  ALTER TABLE "layout" ADD COLUMN "footer_salons_title" varchar;
  ALTER TABLE "layout" ADD COLUMN "footer_contacts_title" varchar;
  ALTER TABLE "layout" ADD COLUMN "footer_contact_title" varchar;
  ALTER TABLE "layout" ADD COLUMN "footer_contact_button_label" varchar;
  ALTER TABLE "layout" ADD COLUMN "cookies_lead" varchar DEFAULT 'Мы используем cookies';
  ALTER TABLE "layout" ADD COLUMN "cookies_text" varchar DEFAULT '— чтобы сайт работал корректно и становился лучше.';
  ALTER TABLE "layout" ADD COLUMN "cookies_more_label" varchar;
  ALTER TABLE "layout" ADD COLUMN "cookies_reject_label" varchar DEFAULT 'Отказаться';
  ALTER TABLE "layout" ADD COLUMN "cookies_necessary_label" varchar DEFAULT 'Только необходимые';
  ALTER TABLE "layout" ADD COLUMN "cookies_accept_label" varchar DEFAULT 'Принять все';
  ALTER TABLE "settings" ADD COLUMN "requisites_company" varchar;
  ALTER TABLE "settings" ADD COLUMN "requisites_inn" varchar;
  ALTER TABLE "settings" ADD COLUMN "requisites_ogrn" varchar;
  ALTER TABLE "settings" ADD COLUMN "requisites_legal_address" varchar;
  ALTER TABLE "settings" ADD COLUMN "requisites_hours" varchar;
  ALTER TABLE "layout_footer_buyer_links" ADD CONSTRAINT "layout_footer_buyer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."layout"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "layout_footer_buyer_links_order_idx" ON "layout_footer_buyer_links" USING btree ("_order");
  CREATE INDEX "layout_footer_buyer_links_parent_id_idx" ON "layout_footer_buyer_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "layout_footer_buyer_links" CASCADE;
  ALTER TABLE "layout" DROP COLUMN "footer_menu_title";
  ALTER TABLE "layout" DROP COLUMN "footer_buyers_title";
  ALTER TABLE "layout" DROP COLUMN "footer_salons_title";
  ALTER TABLE "layout" DROP COLUMN "footer_contacts_title";
  ALTER TABLE "layout" DROP COLUMN "footer_contact_title";
  ALTER TABLE "layout" DROP COLUMN "footer_contact_button_label";
  ALTER TABLE "layout" DROP COLUMN "cookies_lead";
  ALTER TABLE "layout" DROP COLUMN "cookies_text";
  ALTER TABLE "layout" DROP COLUMN "cookies_more_label";
  ALTER TABLE "layout" DROP COLUMN "cookies_reject_label";
  ALTER TABLE "layout" DROP COLUMN "cookies_necessary_label";
  ALTER TABLE "layout" DROP COLUMN "cookies_accept_label";
  ALTER TABLE "settings" DROP COLUMN "requisites_company";
  ALTER TABLE "settings" DROP COLUMN "requisites_inn";
  ALTER TABLE "settings" DROP COLUMN "requisites_ogrn";
  ALTER TABLE "settings" DROP COLUMN "requisites_legal_address";
  ALTER TABLE "settings" DROP COLUMN "requisites_hours";`)
}
