import * as migration_20260924_200446_initial from './20260924_200446_initial'
import * as migration_20260925_211010_cms_schema from './20260925_211010_cms_schema'
import * as migration_20261002_205521_page_drafts_og from './20261002_205521_page_drafts_og'
import * as migration_20261006_174017_about_home_sections from './20261006_174017_about_home_sections'
import * as migration_20261007_083600_home_v3 from './20261007_083600_home_v3'
import * as migration_20261008_090811_news_cover_video from './20261008_090811_news_cover_video'
import * as migration_20261009_113818_salons_data from './20261009_113818_salons_data'
import * as migration_20261012_214643_about_v2 from './20261012_214643_about_v2'
import * as migration_20261013_134632_catalogs_render from './20261013_134632_catalogs_render'
import * as migration_20261013_212556_designers_v2 from './20261013_212556_designers_v2'
import * as migration_20261017_112548_news_autosave from './20261017_112548_news_autosave'
import * as migration_20261020_025642_news_share_max from './20261020_025642_news_share_max'
import * as migration_20261020_125550_works_v2 from './20261020_125550_works_v2'
import * as migration_20261023_190746_works_project_cta from './20261023_190746_works_project_cta'
import * as migration_20261026_135522_legal_docs from './20261026_135522_legal_docs'

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
    name: '20261006_174017_about_home_sections',
  },
  {
    up: migration_20261007_083600_home_v3.up,
    down: migration_20261007_083600_home_v3.down,
    name: '20261007_083600_home_v3',
  },
  {
    up: migration_20261008_090811_news_cover_video.up,
    down: migration_20261008_090811_news_cover_video.down,
    name: '20261008_090811_news_cover_video',
  },
  {
    up: migration_20261009_113818_salons_data.up,
    down: migration_20261009_113818_salons_data.down,
    name: '20261009_113818_salons_data',
  },
  {
    up: migration_20261012_214643_about_v2.up,
    down: migration_20261012_214643_about_v2.down,
    name: '20261012_214643_about_v2',
  },
  {
    up: migration_20261013_134632_catalogs_render.up,
    down: migration_20261013_134632_catalogs_render.down,
    name: '20261013_134632_catalogs_render',
  },
  {
    up: migration_20261013_212556_designers_v2.up,
    down: migration_20261013_212556_designers_v2.down,
    name: '20261013_212556_designers_v2',
  },
  {
    up: migration_20261017_112548_news_autosave.up,
    down: migration_20261017_112548_news_autosave.down,
    name: '20261017_112548_news_autosave',
  },
  {
    up: migration_20261020_025642_news_share_max.up,
    down: migration_20261020_025642_news_share_max.down,
    name: '20261020_025642_news_share_max',
  },
  {
    up: migration_20261020_125550_works_v2.up,
    down: migration_20261020_125550_works_v2.down,
    name: '20261020_125550_works_v2',
  },
  {
    up: migration_20261023_190746_works_project_cta.up,
    down: migration_20261023_190746_works_project_cta.down,
    name: '20261023_190746_works_project_cta',
  },
  {
    up: migration_20261026_135522_legal_docs.up,
    down: migration_20261026_135522_legal_docs.down,
    name: '20261026_135522_legal_docs',
  },
]
