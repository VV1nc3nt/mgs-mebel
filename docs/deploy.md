# Деплой: CI/CD и staging

## Схема
PR → CI (GitHub Actions) → merge в `main` → сборка Docker-образа → GHCR → SSH на VPS → `docker compose up -d` → healthcheck → при провале откат.

## Сервер (staging)
- Чистый VPS (Ubuntu LTS, ≥ 2 ГБ RAM), Docker + Compose plugin, пользователь `deploy` (в группе docker), вход только по SSH-ключу, ufw: 22, 80, 443.
- Домен задаётся переменной `SITE_DOMAIN` в `/opt/mgs/.env` и используется в `Caddyfile`: поддомен клиента (`staging.<домен>`) или `staging.<ip-через-дефис>.sslip.io`, пока DNS недоступен.
- Каталог `/opt/mgs`: `compose.yml`, `Caddyfile`, `.env` (только на сервере, в git не попадает), `backups/`.
- Сервисы Compose:
  - `caddy` — reverse proxy, автоматический HTTPS, Basic Auth на весь сайт (включая /admin), заголовок `X-Robots-Tag: noindex, nofollow`.
  - `app` — образ `ghcr.io/<owner>/<repo>:<tag>`, порт 3000 только во внутренней сети, том `media` для загруженных файлов.
  - `postgres` — официальный образ, volume `pgdata`, порт наружу не публикуется.
- Файлы (media): по умолчанию на диске — Docker-том `media`. Если в `.env` задан `S3_BUCKET` (+ `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) — Payload пишет в S3 (Yandex Object Storage или своё S3, напр. Garage). Выбор для прода — позже, код должен поддерживать оба режима.
- Бэкап: cron раз в сутки в `/opt/mgs/backups` — `pg_dump` и архив тома `media` (если файлы на диске), хранить 7 последних.

## Приложение
- `next.config`: `output: 'standalone'`.
- Сборка не требует доступа к БД: страницы, читающие Payload, рендерятся на запрос; запросы в `lib/queries.ts` кэшируются с тегами (`unstable_cache` или `'use cache'` + `cacheTag` — по версии Next), хуки Payload вызывают `revalidateTag`.
- Миграции применяются при старте приложения (`prodMigrations` в адаптере `db-postgres`, миграции из `src/migrations`).
- Healthcheck: `GET /healthz` → 200, делает лёгкий запрос к БД.
- `NEXT_PUBLIC_*` вшиваются при сборке → передаются как build args из GitHub Environment `staging`.

## GitHub Actions
- `ci.yml` — на `pull_request` и push в `main`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`; отдельная job с сервисом `postgres`: `pnpm payload migrate` на пустой БД.
- `deploy-staging.yml` — на push в `main` после успешного CI, `environment: staging`, `concurrency: staging`:
  1. build + push образа с тегами `<sha>` и `staging` (кэш слоёв `type=gha`);
  2. SSH на сервер: запомнить текущий тег, `docker compose pull app && docker compose up -d app`;
  3. проверить `/healthz` (до 60 с); при провале — вернуть предыдущий тег и уронить job.
- Секреты Environment `staging`: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS`. Переменные: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_YMAPS_KEY`.
- Runtime-секреты (`DATABASE_URL`, `PAYLOAD_SECRET`, `SITE_DOMAIN`, `S3_*` (опционально), логин/хэш Basic Auth) живут только в `/opt/mgs/.env`.

## Git-процесс
- Работа в ветках `feat/*`, `fix/*`, `chore/*` → PR в `main`. Прямой push в `main` запрещён (branch protection: обязательный зелёный CI).
- Merge делает владелец репозитория после просмотра.
- Conventional Commits, без служебных трейлеров.
