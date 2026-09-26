# syntax=docker/dockerfile:1

# Node.js LTS. pnpm version comes from "packageManager" in package.json (corepack).
FROM node:24-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack enable && corepack install
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Build (no database access required)
FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_YMAPS_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_YMAPS_KEY=$NEXT_PUBLIC_YMAPS_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack install
RUN mkdir -p public && pnpm build

# Runtime
FROM node:24-alpine AS runner
LABEL org.opencontainers.image.source=https://github.com/VV1nc3nt/mgs-mebel
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MEDIA_DIR=/app/media

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs nextjs \
 && mkdir -p /app/media \
 && chown nextjs:nodejs /app/media

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null || exit 1

CMD ["node", "server.js"]

# Demo content for staging: `docker compose --profile seed run seed` (deploy/seed.sh, docs/deploy.md).
# Built only by the "Seed staging" workflow, never deployed as the app. Needs the full source and
# dev dependencies (payload run, tsx), hence FROM builder.
# NODE_ENV=production: Payload applies prodMigrations instead of pushing a dev schema.
# verify_deps_before_run=false: dependencies are frozen in the image; otherwise pnpm tries to
# reinstall them (and fails as uid 1001) before running a script.
FROM builder AS seed
ENV NODE_ENV=production \
    HOME=/tmp \
    COREPACK_HOME=/opt/corepack \
    pnpm_config_verify_deps_before_run=false
# pnpm 12 downloads its native binary on first run: do it now, so uid 1001 runs pnpm offline.
RUN corepack install && pnpm --version && chmod -R a+rX /opt/corepack
# Same uid/gid as `nextjs` in the runner: files in the media volume keep one owner.
USER 1001:1001
CMD ["pnpm", "seed"]
