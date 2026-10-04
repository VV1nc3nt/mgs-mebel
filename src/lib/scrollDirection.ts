/** Scroll delta that counts as a change of direction (README §5.4). */
export const DIRECTION_THRESHOLD = 6

export type ScrollDirection = 'up' | 'down'

export type ScrollTrack = { lastY: number; dir: ScrollDirection }

/** The design starts as if the last move was up: a page reloaded mid-way shows the dock. */
export const initialScroll = (y: number): ScrollTrack => ({ lastY: y, dir: 'up' })

/** Direction changes only after more than 6px from the last turning point; smaller jitter is ignored. */
export function nextScroll(prev: ScrollTrack, y: number): ScrollTrack {
  const delta = y - prev.lastY
  if (Math.abs(delta) <= DIRECTION_THRESHOLD) return prev
  return { lastY: y, dir: delta > 0 ? 'down' : 'up' }
}

/**
 * scrollY within [0, max]: iOS rubber-band scrolling goes past both edges and springs back,
 * which would read as a scroll up at the bottom of the page.
 */
export const clampScrollY = (y: number, max: number) => Math.min(Math.max(y, 0), Math.max(max, 0))
