import type { ScrollDirection } from './scrollDirection'

/** Hidden on the first screen: until scrollY reaches this share of the viewport (README §5.4). */
export const FIRST_SCREEN = 0.7

/**
 * IntersectionObserver margin for the footer: it counts as visible once its top edge is 40px
 * above the viewport bottom (design: MGSDock `nearFooter`).
 */
export const FOOTER_ROOT_MARGIN = '0px 0px -40px 0px'

export type DockInput = {
  y: number
  vh: number
  dir: ScrollDirection
  /** The footer is in view (the dock would cover its links). */
  footerVisible: boolean
  /** Focus is inside the dock: never hide it from under the keyboard. */
  focusWithin: boolean
  /** The messenger choice is open: it closes itself on a scroll, the dock waits for it. */
  chooserOpen?: boolean
}

export function isDockVisible({
  y,
  vh,
  dir,
  footerVisible,
  focusWithin,
  chooserOpen = false,
}: DockInput): boolean {
  if (focusWithin || chooserOpen) return true
  if (y < FIRST_SCREEN * vh) return false
  if (footerVisible) return false
  return dir === 'up'
}
