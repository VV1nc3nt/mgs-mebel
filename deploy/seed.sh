#!/usr/bin/env bash
# Demo content on staging. Run by .github/workflows/seed-staging.yml, or by hand on the server:
#   /opt/mgs/seed.sh                   create or update the demo content
#   SEED_RESET=true /opt/mgs/seed.sh   delete the demo content (globals and files they use stay)
# Works offline: files come only from /opt/mgs/seed-cache (filled by the workflow or seed-upload.sh).
# Steps: checks → pull the seed image of the current APP_TAG → cache check → backup → seed.
set -euo pipefail

ROOT=${MGS_ROOT:-/opt/mgs}
SEED_RESET=${SEED_RESET:-false}
export SEED_RESET

cd "$ROOT"
[[ -f .env ]] || { echo "ERROR: $ROOT/.env not found" >&2; exit 1; }

env_get() { sed -n "s/^$1=//p" .env | tail -n 1 | tr -d "'\""; }

if [[ "$(env_get ENABLE_DEMO_SEED)" != true ]]; then
  echo "ERROR: ENABLE_DEMO_SEED=true is not set in $ROOT/.env; demo content is disabled here." >&2
  exit 1
fi
APP_TAG=$(env_get APP_TAG)
if [[ ! "$APP_TAG" =~ ^[0-9a-f]{40}$ ]]; then
  echo "ERROR: APP_TAG='$APP_TAG' is not a commit sha; deploy the app first (Deploy staging)." >&2
  exit 1
fi

mkdir -p seed-cache logs
compose() { docker compose --profile seed "$@"; }

echo "==> Pull seed image for $APP_TAG"
compose pull seed

if [[ "$SEED_RESET" != true ]]; then
  echo "==> Check seed cache"
  compose run --rm --no-deps -T seed pnpm seed:check
fi

echo "==> Backup"
./backup.sh

LOG="logs/seed-$(date +%Y%m%d-%H%M%S).log"
echo "==> Seed (reset: $SEED_RESET), log: $ROOT/$LOG"
compose run --rm -T seed 2>&1 | tee "$LOG"

echo "==> Summary"
grep -E ' created +[0-9]+ +updated|удалено|оставлено|^Итого:' "$LOG" || true
