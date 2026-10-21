import type { Page, Route } from '@playwright/test'

/**
 * Holds the requests to `url` (a glob of page.route) until `release()`: a request in flight for
 * as long as the test needs — e.g. a prefetch that must not hold back other requests.
 */
export async function requestGate(page: Page, url: string) {
  const held: Route[] = []
  await page.route(url, (route) => {
    held.push(route)
  })
  return {
    /** Requests held so far. */
    held: () => held.length,
    /** Lets the held ones through and stops holding. */
    release: async () => {
      await Promise.all(held.map((route) => route.continue()))
      await page.unroute(url)
    },
  }
}
