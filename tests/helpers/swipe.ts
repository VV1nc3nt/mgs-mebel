import type { Locator, Page } from '@playwright/test'

/**
 * Listens for the end of the track's scroll before the scroll starts; the returned wait resolves
 * on `scrollend` (or after 1.5 s if the track never scrolls).
 */
export const armScrollEnd = async (track: Locator) => {
  await track.evaluate((el) => {
    const t = el as HTMLElement & { ended?: Promise<void> }
    t.ended = new Promise((resolve) => {
      el.addEventListener('scrollend', () => resolve(), { once: true })
      setTimeout(resolve, 1500)
    })
  })
  return () => track.evaluate((el) => (el as HTMLElement & { ended?: Promise<void> }).ended)
}

/**
 * Swipes the slides of a scroll-snap track with a finger (touch events through CDP): a drag of
 * 0.6 slide across the middle of the window at a finger's pace, then the finger rests before it
 * lifts — no fling, so the track snaps to the next slide, not past it. Resolves on scrollend.
 * Needs `hasTouch`; check gestures in the Linux Chromium of the Playwright image (a Mac Chrome
 * does not tell).
 *
 * `slide` — any slide of the track: its size sets the drag.
 */
export const swiper = async (page: Page, { track, slide }: { track: Locator; slide: Locator }) => {
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [{ x: Math.round(x), y }] })
  return async (direction: 1 | -1) => {
    const box = (await slide.boundingBox())!
    const y = Math.round(box.y + box.height / 2)
    const from = page.viewportSize()!.width / 2 + direction * box.width * 0.3
    const distance = -direction * box.width * 0.6
    const ended = await armScrollEnd(track)
    await touch('touchStart', from, y)
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', from + (distance * i) / 8, y)
      await page.waitForTimeout(16)
    }
    await page.waitForTimeout(200)
    await touch('touchMove', from + distance, y)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await ended()
  }
}
