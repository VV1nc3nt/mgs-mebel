/*
 * Playback stubs. `stubPlayback` — for the card video tests only (home «a cover video only on the
 * current card…», about «on opening only the hero video…», salons «card videos…»): which video is
 * mounted, playing or paused. `stubMedia` — for the project viewer's video (below).
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
 * or start-timeout fallback). `play()` / `pause()` mark the element `playing` / `paused` and fire
 * the `playing` / `pause` events.
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
        this.dispatchEvent(new Event('pause'))
      }
    `,
  })
}

/**
 * Playback stub for the project viewer's video (viewer.e2e), for the same reason as
 * `stubPlayback`: the fixture mp4 cannot play. mp4 requests are never answered; `play()` marks the
 * element `playing`, sets `paused` to false and fires `playing` — or, with `rejectUnmuted`,
 * refuses with NotAllowedError while the element has sound (the autoplay policy); `pause()` marks
 * it `paused` and fires `pause`. `duration` and `currentTime` read values the test sets:
 * `window.__e2eMedia.set(time, duration)` for every video on the page (a new element starts at 0
 * of an unknown length), `window.__e2eMedia.end()` — a playing video reaches its end (`ended`).
 * `stubPlayback` stays as it is for the card video tests.
 */
export async function stubMedia(page: Page, { rejectUnmuted = false } = {}) {
  await page.route('**/*.mp4', () => {})
  await page.addInitScript({
    content: `
      const proto = HTMLMediaElement.prototype
      proto.play = function () {
        if (${rejectUnmuted} && !this.muted) {
          return Promise.reject(new DOMException('autoplay with sound', 'NotAllowedError'))
        }
        this.__e2ePaused = false
        this.setAttribute('${PLAYBACK_ATTR}', 'playing')
        this.dispatchEvent(new Event('playing'))
        return Promise.resolve()
      }
      proto.pause = function () {
        const was = this.__e2ePaused === false
        this.__e2ePaused = true
        this.setAttribute('${PLAYBACK_ATTR}', 'paused')
        if (was) this.dispatchEvent(new Event('pause'))
      }
      Object.defineProperty(proto, 'paused', {
        configurable: true,
        get() { return this.__e2ePaused !== false },
      })
      Object.defineProperty(proto, 'duration', {
        configurable: true,
        get() { return this.__e2eDuration ?? NaN },
      })
      Object.defineProperty(proto, 'currentTime', {
        configurable: true,
        get() { return this.__e2eTime ?? 0 },
        set(value) { this.__e2eTime = value },
      })
      window.__e2eMedia = {
        set(time, duration) {
          for (const video of document.querySelectorAll('video')) {
            video.__e2eTime = time
            if (duration !== undefined) video.__e2eDuration = duration
          }
        },
        end() {
          for (const video of document.querySelectorAll('video')) {
            if (video.__e2ePaused !== false) continue
            video.__e2eTime = video.__e2eDuration
            video.__e2ePaused = true
            video.setAttribute('${PLAYBACK_ATTR}', 'ended')
            video.dispatchEvent(new Event('ended'))
          }
        },
      }
    `,
  })
}
