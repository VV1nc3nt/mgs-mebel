import type { Page } from '@playwright/test'

/** Playback state the stubbed `play()` / `pause()` of a video leave on it. */
export const PLAYBACK_ATTR = 'data-e2e-playback'

/**
 * Background videos that neither fail nor depend on the browser's codecs: mp4 requests are never
 * answered and `play()` reports `playing` at once, so a mounted video stays mounted (no `stalled`
 * or start-timeout fallback). `play()` / `pause()` mark the element `playing` / `paused`.
 */
export async function stubPlayback(page: Page) {
  await page.route('**/*.mp4', () => {})
  // A string, not a function: tsx would wrap a function in `__name`, unknown to the page
  await page.addInitScript({
    content: `
      HTMLMediaElement.prototype.play = function () {
        this.setAttribute('${PLAYBACK_ATTR}', 'playing')
        this.dispatchEvent(new Event('playing'))
        return Promise.resolve()
      }
      HTMLMediaElement.prototype.pause = function () {
        this.setAttribute('${PLAYBACK_ATTR}', 'paused')
      }
    `,
  })
}
