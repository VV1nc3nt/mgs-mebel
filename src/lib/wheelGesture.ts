/**
 * One wheel gesture — one step: shared by the home hero scene (lib/heroStep) and the project
 * viewer. Deltas add up to a step; after it, every event is swallowed for a while, and the
 * inertia tail of the same gesture (a trackpad keeps sending smaller deltas) makes no second step.
 * Pure decisions with the reference numbers of the home hero (home README §1.6).
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

export type GestureInput = {
  /** Wheel deltaY (down > 0) or ±KEY_DELTA. */
  dy: number
  now: number
  /** prefers-reduced-motion. */
  rm: boolean
  /** The owner takes wheel events now (the hero: the page is at the top). */
  active: boolean
  /** The owner has somewhere to go in the direction of `dy`. */
  wants: boolean
}

export type GestureResult = {
  state: StepState
  /** preventDefault: the owner handles the event, the page does not scroll. */
  consume: boolean
  /** Step by one in this direction. */
  step?: 1 | -1
  /** The event counted towards a step (not swallowed by the lock or the inertia tail). */
  counted: boolean
}

export const lockFor = (rm: boolean) => (rm ? LOCK_RM : LOCK)

/** One wheel event (or key press, with dy = ±KEY_DELTA). */
export function wheelGesture(
  s: StepState,
  { dy, now, rm, active, wants }: GestureInput,
): GestureResult {
  if (!dy) return { state: s, consume: false, counted: false }
  const a = Math.abs(dy)
  const dir = Math.sign(dy)
  if (now < s.lockUntil)
    return { state: { ...s, tailA: a, tailT: now }, consume: true, counted: false }
  let state = s
  if (s.tail) {
    const inertia =
      now < s.tailEnd && now - s.tailT < TAIL_GAP && dir === s.tailDir && a <= s.tailA + 1
    if (inertia) return { state: { ...s, tailA: a, tailT: now }, consume: active, counted: false }
    state = { ...s, tail: false }
  }
  if (!active || !wants) return { state: { ...state, acc: 0 }, consume: false, counted: false }
  let acc = now - state.accT > ACC_GAP || Math.sign(state.acc) !== dir ? 0 : state.acc
  acc += dy
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
      counted: true,
    }
  }
  return { state: { ...state, acc, accT: now }, consume: true, counted: true }
}
