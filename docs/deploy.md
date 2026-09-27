# Деплой: CI/CD и staging

## Схема
PR → CI (GitHub Actions) → merge в `main` → сборка Docker-образа → GHCR → SSH на VPS → `docker compose up -d` → healthcheck → при провале откат.

## Сервер (staging)
- Чистый VPS (Ubuntu LTS, ≥ 2 ГБ RAM), Docker + Compose plugin, пользователь `deploy` (в группе docker), вход только по SSH-ключу, ufw: 22, 80, 443.
- Домен задаётся переменной `SITE_DOMAIN` в `/opt/mgs/.env` и используется в `Caddyfile`: поддомен клиента (`staging.<домен>`) или `staging.<ip-через-дефис>.sslip.io`, пока DNS недоступен.
- Каталог `/opt/mgs`: `compose.yml`, `caddy/Caddyfile`, `backup.sh`, `seed.sh`, `.env` (только на сервере, в git не попадает), `backups/`, `seed-cache/` и `logs/` (демо-данные, см. ниже). `compose.yml`, `Caddyfile`, `backup.sh` и `seed.sh` берутся из `deploy/` и обновляются при каждом деплое; `.env` деплой не перезаписывает (меняет только строку `APP_TAG`).
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
- `ci.yml` — на `pull_request` и push в `main`: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm tsc --noEmit`, `pnpm build`, `pnpm test:unit`; standalone-сборка (с `public/` и `.next/static`, как в `Dockerfile`) упаковывается в tar и передаётся артефактом в job `ui-kit`. Отдельная job с сервисом `postgres`: `pnpm payload migrate` на пустой БД, `migrate:status`, проверка дрейфа схемы (`migrate:create drift_check --skip-empty` не должен создать файл) и `pnpm test:int`. Job `ui-kit` (после `build`, свой `postgres`): `/ui-kit` без флага → 404, затем Playwright-спека `tests/e2e/ui-kit.e2e.spec.ts` на standalone-сервере с `ENABLE_UI_KIT=true` (axe, фокус, hit-area 44, 390/834/1440); скриншоты — артефактом.
- `deploy-staging.yml` — на push в `main` после успешного CI, `environment: staging`, `concurrency: staging`:
  1. build + push образа с тегами `<sha>` и `staging` (кэш слоёв `type=gha`);
  2. SSH на сервер (`deploy/deploy.sh`): бэкап (`backup.sh`), синхронизация `compose.yml`/`Caddyfile`/`backup.sh` через `/opt/mgs/.incoming` + `mv` (изменился `compose.yml` → `docker compose up -d` всех сервисов, изменился `Caddyfile` → `caddy reload`), запомнить текущий `APP_TAG`, `docker compose pull app && docker compose up -d app`;
  3. проверить `/healthz` изнутри контейнера (`docker compose exec -T app wget …`) и что `https://<SITE_DOMAIN>/` отвечает 401 (Basic Auth) — до 60 с; при провале — вернуть предыдущий тег и уронить job. Если предыдущего тега нет (первый деплой или `staging`), откатываться некуда — job падает, новая версия остаётся.
- `seed-staging.yml` — «Seed staging», только ручной запуск (`workflow_dispatch`), та же `concurrency: staging` — не пересекается с деплоем. Демо-данные, см. «Демо-данные на staging».
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

## Демо-данные на staging

Демо-контент (салоны, работы, новости, каталоги, глобалы страниц, стоковые медиа из `src/seed/manifest.ts`) нужен, чтобы на staging работал весь функционал. **На проде `ENABLE_DEMO_SEED` не задаётся** — seed там невозможен: `seed.sh` и сам seed отказывают без флага, а seed-образ собирается только этим workflow для staging.

Как устроено:
- Seed запускается отдельным образом `ghcr.io/vv1nc3nt/mgs-mebel:seed-<APP_TAG>` (стадия `seed` в `Dockerfile`), собранным из **того же коммита**, что работающий `app`. Прод-образ (`runner`) от этого не меняется.
- С сервера стоки недоступны (Unsplash — таймаут, Pexels — 403), поэтому seed на сервере работает **только из кэша** `/opt/mgs/seed-cache` (`SEED_OFFLINE=true`, каталог смонтирован в контейнер только на чтение). Кэш заполняет раннер GitHub (`pnpm seed:fetch`) или, запасной путь, Mac владельца (`deploy/seed-upload.sh`).
- `seed.sh`: проверяет флаг и `APP_TAG` → `pull` seed-образа → проверка полноты кэша (`pnpm seed:check`, список файлов — из манифеста в образе) — **до бэкапа** → `./backup.sh` → `docker compose --profile seed run --rm seed` → сводка счётчиков. Полный лог — `/opt/mgs/logs/seed-<дата>.log`.
- Без `--profile seed` сервис `seed` не запускается (`docker compose up` его не трогает).
- Каждый запуск делает бэкап; `backup.sh` хранит 7 последних дампов и 7 архивов media, общих с ежедневным cron (с демо-медиа архив ≈ 60 МБ).

### Включить (один раз, на сервере от deploy)
```bash
grep -q '^ENABLE_DEMO_SEED=' /opt/mgs/.env || echo 'ENABLE_DEMO_SEED=true' >> /opt/mgs/.env
command -v rsync   # нужен для загрузки кэша; если нет — от root: apt install -y rsync
```

### Запуск
GitHub → Actions → **Seed staging** → Run workflow:
- **обычный** (`reset: false`, `skip_fetch: false`): создать или обновить демо-данные. Повторный запуск ничего не дублирует: записи ищутся по slug / названию, файлы — по имени.
- **reset** (`reset: true`): удаляет **только seed-записи коллекций** (работы, новости, каталоги, салоны) и их медиа. **Глобалы (страницы, настройки, layout, stats) и файлы, которые они используют, остаются** — список оставленных файлов есть в логе. Кэш при reset не загружается и не проверяется.
- **пересоздать** = запуск с `reset: true`, затем обычный запуск.

Workflow читает `APP_TAG` из `/opt/mgs/.env`, собирает seed-образ этого коммита (если тега `seed-<APP_TAG>` ещё нет), удаляет старые seed-образы в GHCR — остаются два последних `seed-*`, образы приложения не трогаются (если шаг падает с ошибкой доступа: настройки пакета → Manage Actions access → репозиторию `mgs-mebel` роль Admin), скачивает кэш на раннере (`actions/cache` по хешу манифеста), загружает его через `rsync` в `/opt/mgs/seed-cache` и запускает `/opt/mgs/seed.sh`.

Вручную на сервере (кэш уже загружен): `/opt/mgs/seed.sh` или `SEED_RESET=true /opt/mgs/seed.sh`.

### Запасной путь: стоки недоступны и с раннера
Шаг «Fetch seed files» падает с сообщением «Стоки недоступны с раннера». Тогда на Mac владельца, в корне репозитория:
```bash
pnpm seed:fetch            # скачать кэш в .seed-cache (≈ 51 МБ)
deploy/seed-upload.sh      # проверить кэш и rsync в deploy@5.180.174.123:/opt/mgs/seed-cache (ключ ~/.ssh/mgs_deploy)
```
Затем Actions → Seed staging с `skip_fetch: true`. Хост и ключ переопределяются: `SEED_HOST=deploy@<IP> SSH_KEY_PATH=<ключ> deploy/seed-upload.sh`.

### Ошибки
- `ENABLE_DEMO_SEED=true is not set` — флаг не включён (см. выше).
- `APP_TAG='staging' … is not a commit sha` — приложение ещё не деплоилось workflow; дождаться «Deploy staging».
- `В кэше /seed-cache не хватает N файлов: …` — кэш неполный; бэкап и БД не тронуты. Перезапустить workflow без `skip_fetch` или загрузить кэш через `seed-upload.sh`.
- `rsync: command not found` — поставить rsync на сервере.
- Seed упал посередине — повторный запуск безопасен (идемпотентен). Если данные испорчены — откат из бэкапа, сделанного перед этим запуском.

### Откат из бэкапа
Бэкап перед seed — самые свежие `backups/db-<дата>.dump` и `backups/media-<дата>.tar.gz` (время в имени — сразу перед строкой `==> Seed` в выводе). Восстановление — командами из «Эксплуатации»: `pg_restore` для БД и `tar` для тома `media`, затем `docker compose restart app`. `tar` не удаляет файлы, добавленные seed после бэкапа; чтобы том был точной копией, перед распаковкой очистить его: `docker compose run --rm --no-deps -T --entrypoint sh app -c 'rm -rf /app/media/*'`.

## UI-kit на staging

`/ui-kit` — песочница UI-примитивов (все варианты и состояния, демо-медиа из seed). Без `ENABLE_UI_KIT=true` страница отдаёт 404; с флагом — 200 с `noindex, nofollow`, в sitemap не попадает. Флаг читается на каждый запрос, пересобирать образ не нужно. **На проде не задаётся.**

Переменные попадают в контейнер `app` только через явный список `environment:` в `compose.yml` (там есть `ENABLE_UI_KIT: ${ENABLE_UI_KIT:-}`), поэтому включать флаг — после деплоя версии с этой строкой.

Включить (на сервере от deploy):
```bash
cd /opt/mgs
grep -q '^ENABLE_UI_KIT=' .env || echo 'ENABLE_UI_KIT=true' >> .env
docker compose up -d app                          # пересоздаёт app с новым окружением
docker compose exec app printenv ENABLE_UI_KIT    # → true
docker compose exec app wget -qS -O /dev/null http://127.0.0.1:3000/ui-kit   # HTTP/1.1 200 OK
```
Выключить:
```bash
cd /opt/mgs && sed -i '/^ENABLE_UI_KIT=/d' .env && docker compose up -d app
```

## Git-процесс
- Работа в ветках `feat/*`, `fix/*`, `chore/*` → PR в `main`. Прямой push в `main` запрещён (branch protection: обязательный зелёный CI).
- Merge делает владелец репозитория после просмотра.
- Conventional Commits, без служебных трейлеров.
