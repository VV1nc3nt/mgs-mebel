#!/usr/bin/env bash
# Runs on the server from .github/workflows/deploy-staging.yml:
#   bash /opt/mgs/.incoming/deploy.sh <image-tag>
# The workflow uploads compose.yml, Caddyfile, backup.sh, seed.sh and this script to /opt/mgs/.incoming.
# Steps: backup → sync configs → roll out the new tag → health check → roll back on failure.
# /opt/mgs/.env is never overwritten; only its APP_TAG line is updated.
set -euo pipefail

NEW_TAG=${1:?usage: deploy.sh <image-tag>}
ROOT=${MGS_ROOT:-/opt/mgs}
INCOMING="$ROOT/.incoming"
HEALTH_TIMEOUT=60

cd "$ROOT"
[[ -f .env ]] || { echo "ERROR: $ROOT/.env not found" >&2; exit 1; }

env_get() { sed -n "s/^$1=//p" .env | tail -n 1 | tr -d "'\""; }
env_set_tag() {
  if grep -q '^APP_TAG=' .env; then
    sed -i "s/^APP_TAG=.*/APP_TAG=$1/" .env
  else
    printf 'APP_TAG=%s\n' "$1" >> .env
  fi
}

SITE_DOMAIN=$(env_get SITE_DOMAIN)
PREV_TAG=$(env_get APP_TAG)

# 1. Backup before touching anything (skipped on the very first deploy).
if [[ -f compose.yml && -x backup.sh ]] && [[ -n "$(docker compose ps -q --status running postgres 2>/dev/null)" ]]; then
  echo "==> Backup"
  ./backup.sh
fi

# 2. Sync configs: validate, then replace atomically with mv (same filesystem).
echo "==> Sync configs"
docker compose --project-directory "$ROOT" -f "$INCOMING/compose.yml" config -q

compose_changed=false
caddy_changed=false
if ! cmp -s "$INCOMING/compose.yml" compose.yml; then
  mv "$INCOMING/compose.yml" compose.yml
  compose_changed=true
fi
mkdir -p caddy
if ! cmp -s "$INCOMING/Caddyfile" caddy/Caddyfile; then
  mv "$INCOMING/Caddyfile" caddy/Caddyfile
  caddy_changed=true
fi
chmod 755 "$INCOMING/backup.sh" "$INCOMING/seed.sh"
mv "$INCOMING/backup.sh" backup.sh
mv "$INCOMING/seed.sh" seed.sh
echo "compose.yml changed: $compose_changed, Caddyfile changed: $caddy_changed"

# 3. Roll out.
check_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT)) code
  while (( SECONDS < deadline )); do
    if docker compose exec -T app wget -qO- http://127.0.0.1:3000/healthz >/dev/null 2>&1; then
      code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$SITE_DOMAIN/" || true)
      if [[ "$code" == 401 ]]; then
        echo "healthz: ok, https://$SITE_DOMAIN/: 401 (Basic Auth)"
        return 0
      fi
      echo "waiting: https://$SITE_DOMAIN/ returned '$code', expected 401"
    fi
    sleep 3
  done
  return 1
}

rollout() {
  docker compose up -d app || return 1
  if [[ $compose_changed == true ]]; then
    docker compose up -d --remove-orphans || return 1
  fi
  if [[ $caddy_changed == true ]]; then
    docker compose up -d caddy || return 1
    docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile || return 1
  fi
  echo "==> Health check (up to ${HEALTH_TIMEOUT}s)"
  check_health
}

echo "==> Deploy $NEW_TAG (previous: ${PREV_TAG:-<none>})"
APP_TAG="$NEW_TAG" docker compose pull app
env_set_tag "$NEW_TAG"
if rollout; then
  docker image prune -af --filter 'until=168h' >/dev/null || true
  echo "==> Deployed $NEW_TAG"
  exit 0
fi

echo "ERROR: $NEW_TAG failed to start or health check failed" >&2
docker compose logs --tail 100 app >&2 || true

# 4. Roll back. "staging" is a moving tag (already points to the new image), so it is not a rollback target.
if [[ -z "$PREV_TAG" || "$PREV_TAG" == "staging" || "$PREV_TAG" == "$NEW_TAG" ]]; then
  echo "No previous tag to roll back to; leaving $NEW_TAG in place." >&2
  exit 1
fi
echo "==> Rolling back to $PREV_TAG" >&2
env_set_tag "$PREV_TAG"
if docker compose up -d app && check_health; then
  echo "Rolled back to $PREV_TAG" >&2
else
  echo "ERROR: rollback to $PREV_TAG is unhealthy too" >&2
fi
exit 1
