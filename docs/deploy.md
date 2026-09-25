# Деплой: CI/CD и staging

## Схема
PR → CI (GitHub Actions) → merge в `main` → сборка Docker-образа → GHCR → SSH на VPS → `docker compose up -d` → healthcheck → при провале откат.

## Сервер (staging)
- Чистый VPS (Ubuntu LTS, ≥ 2 ГБ RAM), Docker + Compose plugin, пользователь `deploy` (в группе docker), вход только по SSH-ключу, ufw: 22, 80, 443.
- Домен задаётся переменной `SITE_DOMAIN` в `/opt/mgs/.env` и используется в `Caddyfile`: поддомен клиента (`staging.<домен>`) или `staging.<ip-через-дефис>.sslip.io`, пока DNS недоступен.
- Каталог `/opt/mgs`: `compose.yml`, `caddy/Caddyfile`, `backup.sh`, `.env` (только на сервере, в git не попадает), `backups/`. `compose.yml`, `Caddyfile` и `backup.sh` берутся из `deploy/` и обновляются при каждом деплое; `.env` деплой не перезаписывает (меняет только строку `APP_TAG`).
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
- Загрузка файлов: до 100 МБ на файл (PDF каталогов); лимиты по типам — в коллекции `media` (изображения 20 МБ, видео 60 МБ, PDF 100 МБ). Caddy пропускает тело запроса до 110 МБ.
- `NEXT_PUBLIC_*` вшиваются при сборке → передаются как build args из GitHub Environment `staging`.

## GitHub Actions
- `ci.yml` — на `pull_request` и push в `main`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`; отдельная job с сервисом `postgres`: `pnpm payload migrate` на пустой БД, `migrate:status`, проверка дрейфа схемы (`migrate:create drift_check --skip-empty` не должен создать файл) и `pnpm test:int`.
- `deploy-staging.yml` — на push в `main` после успешного CI, `environment: staging`, `concurrency: staging`:
  1. build + push образа с тегами `<sha>` и `staging` (кэш слоёв `type=gha`);
  2. SSH на сервер (`deploy/deploy.sh`): бэкап (`backup.sh`), синхронизация `compose.yml`/`Caddyfile`/`backup.sh` через `/opt/mgs/.incoming` + `mv` (изменился `compose.yml` → `docker compose up -d` всех сервисов, изменился `Caddyfile` → `caddy reload`), запомнить текущий `APP_TAG`, `docker compose pull app && docker compose up -d app`;
  3. проверить `/healthz` изнутри контейнера (`docker compose exec -T app wget …`) и что `https://<SITE_DOMAIN>/` отвечает 401 (Basic Auth) — до 60 с; при провале — вернуть предыдущий тег и уронить job. Если предыдущего тега нет (первый деплой или `staging`), откатываться некуда — job падает, новая версия остаётся.
- Секреты Environment `staging`: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_KNOWN_HOSTS`. Переменные: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_YMAPS_KEY`.
- Runtime-секреты (`DATABASE_URL`, `PAYLOAD_SECRET`, `SITE_DOMAIN`, `S3_*` (опционально), логин/хэш Basic Auth) живут только в `/opt/mgs/.env`.

## Первичная настройка сервера

Делается один раз. Сервер: чистая Ubuntu 24.04, есть root-доступ по SSH. Swap настраивается отдельно, скрипт его не трогает.

1. **DNS.** A-запись `staging.tmprl.ru` → IP сервера. Проверка: `dig +short staging.tmprl.ru`. Без неё Caddy не получит сертификат.
2. **Ключ администратора у root.** С рабочей машины: `ssh-copy-id root@<IP>`, затем убедиться, что `ssh root@<IP>` пускает без пароля. `bootstrap.sh` откажется отключать вход по паролю, если ни у root, ни у deploy нет `authorized_keys`.
3. **Ключ для GitHub Actions** (отдельный, без пароля), на рабочей машине:
   ```bash
   ssh-keygen -t ed25519 -N '' -C 'gha-deploy-staging' -f ~/.ssh/mgs_staging_deploy
   ```
4. **bootstrap.sh** (от root, идемпотентный — можно перезапускать):
   ```bash
   scp deploy/bootstrap.sh root@<IP>:/root/
   ssh root@<IP> "DEPLOY_PUBKEY='$(cat ~/.ssh/mgs_staging_deploy.pub)' bash /root/bootstrap.sh"
   ```
   Скрипт: обновляет систему; ставит Docker и compose plugin из репозитория Docker; создаёт пользователя `deploy` (группа docker, без пароля, ключи root копируются ему, если своих нет, + `DEPLOY_PUBKEY`); запрещает вход по паролю (`/etc/ssh/sshd_config.d/00-mgs.conf`, root — только по ключу); ufw 22/80/443; fail2ban для sshd; unattended-upgrades; `/opt/mgs` (+ `backups/`, `caddy/`) с владельцем deploy; cron бэкапа в 03:30 (`/etc/cron.d/mgs-backup`).
   Проверить в **новом** терминале, не закрывая текущий: `ssh deploy@<IP>` пускает по ключу, `ssh -o PubkeyAuthentication=no root@<IP>` — отказ.
5. **`/opt/mgs/.env`** (от deploy) — по образцу `deploy/.env.example`:
   ```bash
   scp deploy/.env.example deploy@<IP>:/opt/mgs/.env
   ssh deploy@<IP>
   chmod 600 /opt/mgs/.env && nano /opt/mgs/.env
   ```
   - `POSTGRES_PASSWORD`: `openssl rand -hex 24`; тот же пароль — в `DATABASE_URL` (`postgres://mgs:<пароль>@postgres:5432/mgs`).
   - `PAYLOAD_SECRET`: `openssl rand -hex 32`.
   - Basic Auth: `BASIC_AUTH_USER` — логин; хэш пароля:
     ```bash
     docker run --rm caddy:2-alpine caddy hash-password --plaintext '<пароль>'
     ```
     записать в одинарных кавычках: `BASIC_AUTH_HASH='$2a$14$…'`.
   - `APP_TAG` оставить `staging` — дальше его ведёт деплой.
6. **Доступ сервера к GHCR.** На GitHub: Settings → Developer settings → Personal access tokens (classic) → токен только со scope `read:packages`. На сервере от deploy:
   ```bash
   echo '<PAT>' | docker login ghcr.io -u VV1nc3nt --password-stdin
   ```
7. **Environment `staging` на GitHub** (Settings → Environments → New environment `staging`):
   - Secrets:
     - `SSH_HOST` — IP сервера;
     - `SSH_USER` — `deploy`;
     - `SSH_KEY` — содержимое `~/.ssh/mgs_staging_deploy` (приватный ключ целиком);
     - `SSH_KNOWN_HOSTS` — вывод `ssh-keyscan -t ed25519 <IP>` (сверить отпечаток с `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` на сервере).
   - Variables: `NEXT_PUBLIC_SITE_URL` = `https://staging.tmprl.ru`, `NEXT_PUBLIC_YMAPS_KEY` = ключ Яндекс.Карт (можно пустым, пока карты нет).
8. **Первый деплой.** Merge любого PR в `main` (или Actions → CI → Re-run на последнем коммите `main`). После зелёного CI запустится «Deploy staging»: соберёт образ, зальёт конфиги в `/opt/mgs`, поднимет caddy/app/postgres, применит миграции, проверит здоровье.
9. **Проверка.**
   - `https://staging.tmprl.ru/` просит логин/пароль; после входа открывается сайт, `/admin` — создание первого пользователя.
   - `curl -sI https://staging.tmprl.ru/ | grep -i x-robots` → `noindex, nofollow`.
   - На сервере: `cd /opt/mgs && docker compose ps` — все сервисы `healthy`; `./backup.sh` — в `backups/` появились `db-*.dump` и `media-*.tar.gz`.

### Эксплуатация
- Логи: `cd /opt/mgs && docker compose logs -f app`.
- Ручной откат: поставить в `/opt/mgs/.env` нужный `APP_TAG=<sha>` и выполнить `docker compose up -d app`.
- Восстановление БД: `docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < backups/db-<дата>.dump`.
- Восстановление media: `docker compose run --rm --no-deps -T --entrypoint tar app -xzf - -C /app/media < backups/media-<дата>.tar.gz`.

## Git-процесс
- Работа в ветках `feat/*`, `fix/*`, `chore/*` → PR в `main`. Прямой push в `main` запрещён (branch protection: обязательный зелёный CI).
- Merge делает владелец репозитория после просмотра.
- Conventional Commits, без служебных трейлеров.
