/**
 * Scroll step of the home hero scene (home README §1.6): at the very top of the page a wheel,
 * swipe or key gesture switches the two segments instead of scrolling — segment 01 + down → 02,
 * the page stays; the next new gesture down scrolls the page. 02 + up at the top → 01.
 * Pure decisions with the reference numbers; listeners live in hooks/useHeroStep.
 */

import { KEY_DELTA, lockFor, wheelGesture, type StepState } from './wheelGesture'

export {
  ACC_GAP,
  initialStepState,
  KEY_DELTA,
  LOCK,
  LOCK_RM,
  STEP_DELTA,
  TAIL_GAP,
  TAIL_SPAN,
  type StepState,
} from './wheelGesture'

/** The scene steps only while the page is scrolled at most this far (px). */
export const TOP_Y = 4
/** Swipe distance that makes a step (px). */
export const TOUCH_DELTA = 24

type StepInput = {
  /** Wheel deltaY (down > 0) or ±KEY_DELTA. */
  dy: number
  now: number
  scrollY: number
  /** Current segment: 0 or 1. */
  slide: number
  /** prefers-reduced-motion. */
  rm: boolean
}

export type WheelResult = {
  state: StepState
  /** preventDefault: the scene handles the event, the page does not scroll. */
  consume: boolean
  /** Switch the scene by this many segments. */
  step?: 1 | -1
  /** The page has moved a little (≤ TOP_Y): put it back to 0. */
  resetScroll: boolean
}

/** The scene has a segment to go to in this direction. */
const wants = (dy: number, slide: number) => (dy > 0 && slide === 0) || (dy < 0 && slide === 1)

/** One wheel event (or key press, with dy = ±KEY_DELTA): the shared gesture at the top only. */
export function wheelStep(s: StepState, { dy, now, scrollY, slide, rm }: StepInput): WheelResult {
  const { state, consume, step, counted } = wheelGesture(s, {
    dy,
    now,
    rm,
    active: scrollY <= TOP_Y,
    wants: wants(dy, slide),
  })
  // An event the scene counts puts a slightly moved page back to the top
  return { state, consume, ...(step && { step }), resetScroll: counted && scrollY > 0 }
}

export type TouchResult = { state: StepState; consume: boolean; step?: 1 | -1; fired: boolean }

/**
 * One touchmove: dy = start Y − current Y (finger up = down the page). `fired` — this swipe has
 * already made its step (one swipe, one step); until the lock ends it keeps swallowing touchmove.
 */
export function touchStep(
  s: StepState,
  { dy, now, scrollY, slide, rm, fired }: StepInput & { fired: boolean },
): TouchResult {
  if (fired) return { state: s, consume: scrollY <= TOP_Y && now < s.lockUntil, fired }
  if (scrollY > TOP_Y || !wants(dy, slide)) return { state: s, consume: false, fired }
  if (Math.abs(dy) >= TOUCH_DELTA && now >= s.lockUntil) {
    return {
      state: { ...s, lockUntil: now + lockFor(rm) },
      consume: true,
      step: dy > 0 ? 1 : -1,
      fired: true,
    }
  }
  return { state: s, consume: true, fired }
}

type KeyInput = {
  key: string
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

/**
 * Page keys as a wheel delta: ↓ / PageDown / Space down, ↑ / PageUp / Shift+Space up; 0 — not a
 * page key, or a shortcut with ⌘ / Ctrl / Alt (⌘↓ jumps to the end of the page on a Mac).
 */
export function keyDelta({ key, shiftKey, metaKey, ctrlKey, altKey }: KeyInput): number {
  if (metaKey || ctrlKey || altKey) return 0
  const down = ['ArrowDown', 'PageDown', ' '].includes(key) && !shiftKey
  const up = ['ArrowUp', 'PageUp'].includes(key) || (key === ' ' && shiftKey)
  return down ? KEY_DELTA : up ? -KEY_DELTA : 0
}
