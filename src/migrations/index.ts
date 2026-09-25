import * as migration_20260924_200446_initial from './20260924_200446_initial';
import * as migration_20260925_211010_cms_schema from './20260925_211010_cms_schema';

export const migrations = [
  {
    up: migration_20260924_200446_initial.up,
    down: migration_20260924_200446_initial.down,
    name: '20260924_200446_initial',
  },
  {
    up: migration_20260925_211010_cms_schema.up,
    down: migration_20260925_211010_cms_schema.down,
    name: '20260925_211010_cms_schema'
  },
];
