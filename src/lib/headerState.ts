import type { ScrollDirection } from './scrollDirection'

/**
 * Smart header (a deviation from README §5.2, which keeps it in place):
 * - `top` — in its own place: over the hero or in the flow, scrolls away with the page;
 * - `away` — scrolled out of view, fixed above the viewport edge, no transition (it was not
 *   on screen, so nothing slides);
 * - `hidden` — fixed above the edge after being shown, slides out;
 * - `pinned` — fixed at the top of the viewport on glass, slides in.
 */
export type HeaderState = 'top' | 'away' | 'hidden' | 'pinned'

export type HeaderInput = {
  y: number
  /** Document offset of the header's own place: 0, or below the draft-mode banner. */
  top: number
  height: number
  dir: ScrollDirection
  /** Focus is inside the header: Tab to a hidden header shows it. */
  focusWithin: boolean
  /** The menu is open or animating: the page is frozen, the header keeps its state. */
  menuOpen: boolean
}

export function nextHeaderState(
  prev: HeaderState,
  { y, top, height, dir, focusWithin, menuOpen }: HeaderInput,
): HeaderState {
  if (menuOpen) return prev
  // At its own place the fixed and the in-flow positions coincide: back without a jump
  if (y <= top) return 'top'
  // Still partly in view: it scrolls with the page, as before
  if (prev === 'top' && y < top + height) return 'top'
  // From the flow only out of view, never straight to pinned: the switch to fixed is never on
  // screen (CLS 0). The header re-evaluates after every change, so away → pinned follows.
  if (prev === 'top') return 'away'
  if (focusWithin) return 'pinned'
  if (dir === 'up') return 'pinned'
  return prev === 'away' ? 'away' : 'hidden'
}
