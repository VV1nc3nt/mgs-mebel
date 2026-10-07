/**
 * Scroll step of the home hero scene (home README §1.6): at the very top of the page a wheel,
 * swipe or key gesture switches the two segments instead of scrolling — segment 01 + down → 02,
 * the page stays; the next new gesture down scrolls the page. 02 + up at the top → 01.
 * Pure decisions with the reference numbers; listeners live in hooks/useHeroStep.
 */

/** |accumulated wheel delta| that makes a step (px). */
export const STEP_DELTA = 24
/** Wheel deltas add up while they come at most this far apart (ms) in one direction. */
export const ACC_GAP = 250
/** After a step every event is swallowed for this long (ms); shorter with reduced motion. */
export const LOCK = 600
export const LOCK_RM = 300
/** Inertia tail: events closer than this (ms) in the step's direction, not growing… */
export const TAIL_GAP = 120
/** …for at most this long after the step (ms), belong to the gesture that made it. */
export const TAIL_SPAN = 1800
/** The scene steps only while the page is scrolled at most this far (px). */
export const TOP_Y = 4
/** Swipe distance that makes a step (px). */
export const TOUCH_DELTA = 24
/** Delta of one key press: far above STEP_DELTA, so one press is one step. */
export const KEY_DELTA = 100

export type StepState = {
  lockUntil: number
  acc: number
  accT: number
  tail: boolean
  tailDir: number
  tailA: number
  tailT: number
  tailEnd: number
}

export const initialStepState = (): StepState => ({
  lockUntil: 0,
  acc: 0,
  accT: 0,
  tail: false,
  tailDir: 0,
  tailA: 0,
  tailT: 0,
  tailEnd: 0,
})

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

const lockFor = (rm: boolean) => (rm ? LOCK_RM : LOCK)

/** The scene has a segment to go to in this direction. */
const wants = (dy: number, slide: number) => (dy > 0 && slide === 0) || (dy < 0 && slide === 1)

/** One wheel event (or key press, with dy = ±KEY_DELTA). */
export function wheelStep(s: StepState, { dy, now, scrollY, slide, rm }: StepInput): WheelResult {
  const none = { consume: false, resetScroll: false }
  if (!dy) return { state: s, ...none }
  const a = Math.abs(dy)
  const dir = Math.sign(dy)
  const top = scrollY <= TOP_Y
  if (now < s.lockUntil) {
    return { state: { ...s, tailA: a, tailT: now }, consume: true, resetScroll: false }
  }
  let state = s
  if (s.tail) {
    const inertia =
      now < s.tailEnd && now - s.tailT < TAIL_GAP && dir === s.tailDir && a <= s.tailA + 1
    if (inertia) return { state: { ...s, tailA: a, tailT: now }, consume: top, resetScroll: false }
    state = { ...s, tail: false }
  }
  if (!top || !wants(dy, slide)) return { state: { ...state, acc: 0 }, ...none }
  let acc = now - state.accT > ACC_GAP || Math.sign(state.acc) !== dir ? 0 : state.acc
  acc += dy
  const resetScroll = scrollY > 0
  if (Math.abs(acc) >= STEP_DELTA) {
    return {
      state: {
        ...state,
        acc: 0,
        accT: now,
        lockUntil: now + lockFor(rm),
        tail: true,
        tailDir: dir,
        tailA: a,
        tailT: now,
        tailEnd: now + TAIL_SPAN,
      },
      consume: true,
      step: dir as 1 | -1,
      resetScroll,
    }
  }
  return { state: { ...state, acc, accT: now }, consume: true, resetScroll }
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
