import * as migration_20260924_200446_initial from './20260924_200446_initial';
import * as migration_20260925_211010_cms_schema from './20260925_211010_cms_schema';
import * as migration_20261002_205521_page_drafts_og from './20261002_205521_page_drafts_og';
import * as migration_20261006_174017_about_home_sections from './20261006_174017_about_home_sections';

export const migrations = [
  {
    up: migration_20260924_200446_initial.up,
    down: migration_20260924_200446_initial.down,
    name: '20260924_200446_initial',
  },
  {
    up: migration_20260925_211010_cms_schema.up,
    down: migration_20260925_211010_cms_schema.down,
    name: '20260925_211010_cms_schema',
  },
  {
    up: migration_20261002_205521_page_drafts_og.up,
    down: migration_20261002_205521_page_drafts_og.down,
    name: '20261002_205521_page_drafts_og',
  },
  {
    up: migration_20261006_174017_about_home_sections.up,
    down: migration_20261006_174017_about_home_sections.down,
    name: '20261006_174017_about_home_sections'
  },
];
