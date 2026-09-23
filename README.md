# MGS MEBEL

Сайт мебельной фабрики MGS MEBEL. Next.js (App Router) + Payload CMS 3 в одном приложении, PostgreSQL, Tailwind CSS v4.

## Требования

- Node.js ≥ 20.9, pnpm
- Docker (для локальной базы)

## Локальный запуск

```bash
cp .env.example .env                               # заполнить PAYLOAD_SECRET
docker compose -f docker-compose.dev.yml up -d     # PostgreSQL на localhost:5432
pnpm install
pnpm dev
```

- Сайт: http://localhost:3000
- Админка: http://localhost:3000/admin

## Команды

| Команда | Что делает |
|---|---|
| `pnpm dev` | dev-сервер |
| `pnpm build` / `pnpm start` | production-сборка и запуск |
| `pnpm lint` | ESLint |
| `pnpm tsc --noEmit` | проверка типов |
| `pnpm generate:types` | обновить `src/payload-types.ts` после изменения схемы |
| `pnpm payload migrate:create` / `pnpm payload migrate` | миграции PostgreSQL |

Перед коммитом: `pnpm lint && pnpm tsc --noEmit && pnpm build`.

## Переменные окружения

См. `.env.example`. Файлы по умолчанию хранятся на диске (`media/`); S3 включается, если задан `S3_BUCKET`.

## Структура

- `src/app/(frontend)` — страницы сайта, `globals.css` с дизайн-токенами (`@theme`)
- `src/app/(payload)` — админка и API Payload
- `src/collections`, `src/globals` — схема CMS

## Деплой

См. [docs/deploy.md](docs/deploy.md).
