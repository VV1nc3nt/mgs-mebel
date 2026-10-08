/*
 * Playback stub for the news cover video tests only (home «a cover video only on the current
 * card…», about «on opening only the hero video…»): which video is mounted, playing or paused.
 *
 * Why a stub: the fixture mp4 (seedHome) is an `ftyp` box without tracks, so no browser plays it —
 * answered, it fails with `error`; unanswered, Chrome fires `stalled` after ~3 s; either way the
 * player falls back to the poster. A playable file would depend on the codecs of the CI Chromium
 * (no H.264) or need a committed binary.
 *
 * The background video fallbacks are NOT checked with it: those tests (about «hero background
 * video», ui-kit «background videos mount and play») use the real `play()` and `page.route`.
 * Call it inside a test, on its `page` — never in a fixture or `beforeEach`.
 */
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
