#!/usr/bin/env bash
# Daily backup (cron) and pre-deploy backup: pg_dump + archive of the `media` volume.
# Keeps the last 7 of each in /opt/mgs/backups.
set -euo pipefail

ROOT=${MGS_ROOT:-/opt/mgs}
BACKUP_DIR="$ROOT/backups"
KEEP=7
TS=$(date +%Y%m%d-%H%M%S)

cd "$ROOT"
mkdir -p "$BACKUP_DIR"

# Database
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$BACKUP_DIR/db-$TS.dump.part"
mv "$BACKUP_DIR/db-$TS.dump.part" "$BACKUP_DIR/db-$TS.dump"
echo "db:    $BACKUP_DIR/db-$TS.dump"

# Media (only when files are stored on disk)
if grep -Eq '^S3_BUCKET=.+' .env; then
  echo "media: skipped (S3_BUCKET is set)"
else
  docker compose run --rm --no-deps -T --entrypoint tar app -czf - -C /app/media . \
    > "$BACKUP_DIR/media-$TS.tar.gz.part"
  mv "$BACKUP_DIR/media-$TS.tar.gz.part" "$BACKUP_DIR/media-$TS.tar.gz"
  echo "media: $BACKUP_DIR/media-$TS.tar.gz"
fi

# Rotation (file names are generated above, so ls is safe here)
rotate() {
  # shellcheck disable=SC2012
  ls -1t "$@" 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f -- || true
}
rotate "$BACKUP_DIR"/db-*.dump
rotate "$BACKUP_DIR"/media-*.tar.gz
