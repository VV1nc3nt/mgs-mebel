import type { Page } from '@playwright/test'

/**
 * Waits until the page stops changing under the test: images in view decoded (lazy ones load
 * as they scroll in) and the document height the same over two frames.
 */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    // In view on both axes: slides beside the current one never load (lazy), and decode() of a
    // never-loaded image does not settle
    const inView = [...document.images].filter((img) => {
      const box = img.getBoundingClientRect()
      return (
        box.width > 0 &&
        box.bottom > 0 &&
        box.top < window.innerHeight &&
        box.right > 0 &&
        box.left < window.innerWidth
      )
    })
    await Promise.race([
      Promise.all(inView.map((img) => img.decode().catch(() => undefined))),
      new Promise((r) => setTimeout(r, 3000)),
    ])
    let height = -1
    while (height !== document.documentElement.scrollHeight) {
      height = document.documentElement.scrollHeight
      // Two frames; no named helpers in here: the test transpiler wraps them in __name()
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })
}

/**
 * Real wheel input: scroll events with a direction, as a user makes them. Returns after the
 * smooth scroll ends (`scrollend`): a wheel during a running scroll animation merges into it and
 * may move the page by only a few pixels — below the direction threshold of the header and the dock.
 */
export async function wheel(page: Page, dy: number) {
  await page.evaluate(() => {
    const w = window as Window & { scrollEnded?: Promise<void> }
    w.scrollEnded = new Promise((resolve) => {
      window.addEventListener('scrollend', () => resolve(), { once: true })
      // No scroll at all (already at the edge): no scrollend
      setTimeout(resolve, 1500)
    })
  })
  await page.mouse.move(100, 300)
  await page.mouse.wheel(0, dy)
  await page.evaluate(() => (window as Window & { scrollEnded?: Promise<void> }).scrollEnded)
}

/** Sum of layout shifts since navigation (buffered entries included). */
export const cls = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number
            hadRecentInput: boolean
          })[]) {
            if (!entry.hadRecentInput) total += entry.value
          }
        }).observe({ type: 'layout-shift', buffered: true })
        setTimeout(() => resolve(total), 500)
      }),
  )
