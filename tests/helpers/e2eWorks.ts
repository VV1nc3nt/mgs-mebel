import type { Page, Route } from '@playwright/test'

import { projectPlan, projectSlug } from '../../src/seed/data/projects'

/** Title of the `worksPage` heading draft in the draft-mode check. */
export const WORKS_DRAFT_TITLE = 'Черновик наших работ'

/** The fixture's projects in feed order (`order` = the seed number): title, slug, category, video. */
export const E2E_WORKS = [...projectPlan]
  .sort((a, b) => a.n - b.n)
  .map((p) => ({
    title: p.title,
    slug: projectSlug(p),
    category: p.category,
    video: Boolean(p.video),
  }))

type Held = { route: Route; body: string }

/**
 * Holds the `loadProjects` Server Action requests (POST with a `Next-Action` header) of the page
 * until released: `hold()` starts holding, `release(match?)` lets the held ones through — all or
 * those whose body contains `match` (e.g. `"kitchens"`), `free()` stops holding.
 * `count()` — Server Action requests seen so far, held or not.
 */
export async function actionGate(page: Page) {
  let holding = false
  let seen = 0
  const held: Held[] = []
  await page.route('**/works**', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST' || !request.headers()['next-action']) return route.fallback()
    seen++
    if (!holding) return route.fallback()
    held.push({ route, body: request.postData() ?? '' })
  })
  return {
    hold: () => {
      holding = true
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
    held: () => held.length,
    count: () => seen,
  }
}
