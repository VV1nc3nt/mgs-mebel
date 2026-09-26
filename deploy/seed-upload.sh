#!/usr/bin/env bash
# Fallback when the GitHub runner cannot reach the stock sites: upload the local seed cache
# to staging, then run the "Seed staging" workflow with skip_fetch: true.
#   pnpm seed:fetch && deploy/seed-upload.sh
set -euo pipefail

SEED_HOST=${SEED_HOST:-deploy@5.180.174.123}
SSH_KEY_PATH=${SSH_KEY_PATH:-$HOME/.ssh/mgs_deploy}
CACHE=${SEED_CACHE_DIR:-.seed-cache}

cd "$(dirname "$0")/.."
[[ -d "$CACHE" ]] || { echo "ERROR: $CACHE not found; run pnpm seed:fetch first." >&2; exit 1; }
pnpm seed:check

# The seed container runs as uid 1001: files must be world-readable (755 / 644).
# macOS ships openrsync, which ignores --chmod: set the modes here and keep them with -p.
find "$CACHE" -type d -exec chmod 755 {} +
find "$CACHE" -type f -exec chmod 644 {} +
rsync -rtpv --delete --exclude '*.part' \
  -e "ssh -i $SSH_KEY_PATH -o IdentitiesOnly=yes" \
  "$CACHE/" "$SEED_HOST:/opt/mgs/seed-cache/"

echo "Done. Now run Actions → Seed staging with skip_fetch: true."
