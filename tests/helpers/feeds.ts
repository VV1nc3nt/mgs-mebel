import type { Page } from '@playwright/test'

/*
 * Feed changes of the pages with chips (works, catalogs, news): the wave of the new elements and
 * the Server Actions behind a change.
 */

/** Records every `data-wave` state the list (`selector`) and its children go through. */
export const recordWave = (page: Page, selector: string) =>
  page.evaluate(
    `(() => {
      window.__wave = []
      const list = document.querySelector(${JSON.stringify(selector)})
      new MutationObserver((records) => {
        for (const r of records) window.__wave.push((r.target === list ? 'list:' : '') + r.target.getAttribute('data-wave'))
      }).observe(list, { attributes: true, subtree: true, attributeFilter: ['data-wave'] })
    })()`,
  )

/** The states recorded by `recordWave`. */
export const waveStates = (page: Page) =>
  page.evaluate('window.__wave') as Promise<(string | null)[]>

/** Counts the Server Action requests of the page from now on. */
export const countActions = (page: Page) => {
  const bodies: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.headers()['next-action']) {
      bodies.push(request.postData() ?? '')
    }
  })
  return { count: () => bodies.length, bodies: () => [...bodies] }
}

/** Server Actions posted to `url` (a glob of page.route) answer 500 until `off()`. */
export async function failActions(page: Page, url: string) {
  await page.route(url, (route) => {
    const request = route.request()
    if (request.method() === 'POST' && request.headers()['next-action']) {
      return route.fulfill({ status: 500, body: 'E2E: failed load' })
    }
    return route.fallback()
  })
  return { off: () => page.unroute(url) }
}
