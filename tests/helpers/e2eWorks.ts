import type { Page, Route } from '@playwright/test'

import { projectPlan, projectSlug } from '../../src/seed/data/projects'

/** Title of the `worksPage` heading draft in the draft-mode check. */
export const WORKS_DRAFT_TITLE = 'Черновик наших работ'

/**
 * The fixture's projects in feed order (`order` = the seed number): title, slug, category, video,
 * frames (a video project: the video, then its photos).
 */
export const E2E_WORKS = [...projectPlan]
  .sort((a, b) => a.n - b.n)
  .map((p) => ({
    title: p.title,
    slug: projectSlug(p),
    category: p.category,
    video: Boolean(p.video),
    frames: p.photos.length + (p.video ? 1 : 0),
  }))

type Held = { route: Route; body: string }

/**
 * Holds the `loadProjects` Server Action requests (POST with a `Next-Action` header) of the page
 * until released: `hold()` starts holding, `release(match?)` lets the held ones through — all or
 * those whose body contains `match` (e.g. `"kitchens"`), `free()` stops holding.
 * The feed asks for the next page by itself while its end is in the preload zone, so a test that
 * counts cards holds the requests and lets through exactly the pages it expects.
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
    /** Held requests: all or those whose body contains `match`. */
    held: (match?: string) => held.filter(({ body }) => !match || body.includes(match)).length,
    count: () => seen,
  }
}
