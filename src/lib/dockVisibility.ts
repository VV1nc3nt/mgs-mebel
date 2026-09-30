/** Scroll delta that counts as a change of direction (README §5.4). */
export const DIRECTION_THRESHOLD = 6

/** Hidden on the first screen: until scrollY reaches this share of the viewport (README §5.4). */
export const FIRST_SCREEN = 0.7

/**
 * IntersectionObserver margin for the footer: it counts as visible once its top edge is 40px
 * above the viewport bottom (design: MGSDock `nearFooter`).
 */
export const FOOTER_ROOT_MARGIN = '0px 0px -40px 0px'

export type ScrollDirection = 'up' | 'down'

export type DockScroll = { lastY: number; dir: ScrollDirection }

/** The design starts as if the last move was up: a page reloaded mid-way shows the dock. */
export const initialDockScroll = (y: number): DockScroll => ({ lastY: y, dir: 'up' })

/** Direction changes only after more than 6px from the last turning point; smaller jitter is ignored. */
export function nextDockScroll(prev: DockScroll, y: number): DockScroll {
  const delta = y - prev.lastY
  if (Math.abs(delta) <= DIRECTION_THRESHOLD) return prev
  return { lastY: y, dir: delta > 0 ? 'down' : 'up' }
}

export type DockInput = {
  y: number
  vh: number
  dir: ScrollDirection
  /** The footer is in view (the dock would cover its links). */
  footerVisible: boolean
  /** Focus is inside the dock: never hide it from under the keyboard. */
  focusWithin: boolean
}

export function isDockVisible({ y, vh, dir, footerVisible, focusWithin }: DockInput): boolean {
  if (focusWithin) return true
  if (y < FIRST_SCREEN * vh) return false
  if (footerVisible) return false
  return dir === 'up'
}
