import * as migration_20260924_200446_initial from './20260924_200446_initial';

export const migrations = [
  {
    up: migration_20260924_200446_initial.up,
    down: migration_20260924_200446_initial.down,
    name: '20260924_200446_initial',
  },
];
