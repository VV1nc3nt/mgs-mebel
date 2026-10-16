import type { Page, Route } from '@playwright/test'

import type { NewsType } from '../../src/lib/newsTypes'
import { news } from '../../src/seed/data/news'
import { E2E_NEWS_COUNT } from './e2eHome'

type E2ENews = { slug: string; title: string; type: NewsType; date: string; lead: string }

/** Day-only dates at noon UTC, as in the seed. */
const day = (value: string) => `${value}T12:00:00.000Z`

/**
 * Published news of the fixture besides the first seed ones (E2E_NEWS_COUNT): all older than
 * them, so the home slider keeps its three. 13 in all — 3 pages of «все» (6 / 6 / 1), 7 news
 * (the button), 6 new (one page exactly, no button). Two share a date: the later created comes
 * first (`-id`). One has a lead long enough to be clamped.
 */
export const E2E_EXTRA_NEWS: readonly E2ENews[] = [
  {
    slug: 'e2e-news-1',
    title: 'E2E: новость 1',
    type: 'news',
    date: day('2025-12-20'),
    lead: 'Тестовая новость фикстуры: первая из дополнительных.',
  },
  {
    slug: 'e2e-new-1',
    title: 'E2E: новинка 1',
    type: 'new',
    date: day('2025-12-05'),
    lead:
      'Тестовая новинка с длинным лидом: текст карточки обрезается по трём строкам, ' +
      'поэтому здесь нарочно много слов, которые не помещаются в карточку высотой 420 ' +
      'на ширине телефона, планшета и десктопа, и ещё несколько слов для верности.',
  },
  {
    slug: 'e2e-news-2',
    title: 'E2E: новость 2',
    type: 'news',
    date: day('2025-11-18'),
    lead: 'Тестовая новость фикстуры.',
  },
  {
    slug: 'e2e-news-3',
    title: 'E2E: новость 3',
    type: 'news',
    date: day('2025-10-30'),
    lead: 'Тестовая новость фикстуры.',
  },
  {
    slug: 'e2e-new-2',
    title: 'E2E: новинка 2',
    type: 'new',
    date: day('2025-10-01'),
    lead: 'Тестовая новинка фикстуры, та же дата, что у следующей.',
  },
  {
    slug: 'e2e-news-4',
    title: 'E2E: новость 4',
    type: 'news',
    date: day('2025-10-01'),
    lead: 'Тестовая новость фикстуры, создана позже — в списке раньше.',
  },
  {
    slug: 'e2e-new-3',
    title: 'E2E: новинка 3',
    type: 'new',
    date: day('2025-08-14'),
    lead: 'Тестовая новинка фикстуры.',
  },
  {
    slug: 'e2e-news-5',
    title: 'E2E: новость 5',
    type: 'news',
    date: day('2025-07-02'),
    lead: 'Тестовая новость фикстуры.',
  },
  {
    slug: 'e2e-new-4',
    title: 'E2E: новинка 4',
    type: 'new',
    date: day('2025-06-10'),
    lead: 'Тестовая новинка фикстуры: последняя в списке.',
  },
]

/** Title of the newsPage hero in its draft (draft mode checks put it there and take it back). */
export const NEWS_PAGE_DRAFT_TITLE = 'E2E: черновик страницы новостей'

/**
 * Published news of the fixture in list order (`-date`, `-id`): the seed ones were created first,
 * then E2E_EXTRA_NEWS in order, so among equal dates the later one comes first.
 */
export const E2E_NEWS = [
  ...news(() => 0)
    .slice(0, E2E_NEWS_COUNT)
    .map((item) => ({ slug: item.slug!, title: item.title, type: item.type, date: item.date })),
  ...E2E_EXTRA_NEWS,
]
  .map((item, created) => ({ ...item, created }))
  .sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created)
  .map(({ created: _created, ...item }) => item)

type Held = { route: Route; body: string }

/**
 * Holds the `loadNews` Server Action requests (POST with a `Next-Action` header) until released:
 * `hold()` starts holding, `release(match?)` lets the held ones through — all or those whose body
 * contains `match` (e.g. `"page":2`, `"new"`), `free()` stops holding. `fail(on)` answers them
 * with a 500 instead (a failed load). `held(match?)` — the requests held now.
 */
export async function newsGate(page: Page) {
  let holding = false
  let failing = false
  const held: Held[] = []
  await page.route('**/news**', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST' || !request.headers()['next-action']) return route.fallback()
    if (failing) return route.fulfill({ status: 500, body: 'E2E: failed load' })
    if (!holding) return route.fallback()
    held.push({ route, body: request.postData() ?? '' })
  })
  return {
    hold: () => {
      holding = true
    },
    fail: (on: boolean) => {
      failing = on
    },
    free: async () => {
      holding = false
      await Promise.all(held.splice(0).map(({ route }) => route.fallback()))
    },
    release: async (match?: string) => {
      const out = held.filter(({ body }) => !match || body.includes(match))
      for (const item of out) held.splice(held.indexOf(item), 1)
      await Promise.all(out.map(({ route }) => route.fallback()))
    },
    held: (match?: string) => held.filter(({ body }) => !match || body.includes(match)).length,
  }
}
