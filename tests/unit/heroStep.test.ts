import { describe, expect, it } from 'vitest'

import {
  initialStepState,
  keyDelta,
  touchStep,
  wheelStep,
  type StepState,
} from '@/lib/heroStep'

const T0 = 10_000

const wheel = (s: StepState, dy: number, now: number, extra: Partial<Parameters<typeof wheelStep>[1]> = {}) =>
  wheelStep(s, { dy, now, scrollY: 0, slide: 0, rm: false, ...extra })

/** State right after a step down from 01 at T0. */
const afterStep = (rm = false) => {
  const r = wheel(initialStepState(), 100, T0, { rm })
  expect(r.step).toBe(1)
  return r.state
}

describe('wheelStep', () => {
  it('steps when the accumulated delta reaches 24, not at 23', () => {
    const below = wheel(initialStepState(), 23, T0)
    expect(below).toMatchObject({ consume: true, resetScroll: false })
    expect(below.step).toBeUndefined()
    const at = wheel(initialStepState(), 24, T0)
    expect(at).toMatchObject({ consume: true, step: 1 })
  })

  it('adds deltas up to 250 ms apart; 251 ms starts again', () => {
    const first = wheel(initialStepState(), 12, T0).state
    expect(wheel(first, 12, T0 + 250).step).toBe(1)
    const late = wheel(first, 12, T0 + 251)
    expect(late.step).toBeUndefined()
    expect(late.state.acc).toBe(12)
  })

  it('a change of direction drops the accumulated delta', () => {
    const down = wheel(initialStepState(), 20, T0, { slide: 1 }).state
    // On 02 down is not wanted: nothing accumulates
    expect(down.acc).toBe(0)
    const up = wheel(initialStepState(), -20, T0, { slide: 1 }).state
    const flipped = wheel(up, 20, T0 + 10, { slide: 0 }).state
    expect(flipped.acc).toBe(20)
  })

  it('does not want 01 + up or 02 + down: the page scrolls', () => {
    expect(wheel(initialStepState(), -100, T0, { slide: 0 })).toMatchObject({
      consume: false,
      resetScroll: false,
    })
    expect(wheel(initialStepState(), 100, T0, { slide: 1 })).toMatchObject({ consume: false })
    expect(wheel(initialStepState(), -100, T0, { slide: 1 }).step).toBe(-1)
  })

  it('works only within 4 px of the top and puts a moved page back to 0', () => {
    expect(wheel(initialStepState(), 100, T0, { scrollY: 5 })).toMatchObject({ consume: false })
    expect(wheel(initialStepState(), 100, T0, { scrollY: 4 })).toMatchObject({
      consume: true,
      step: 1,
      resetScroll: true,
    })
    expect(wheel(initialStepState(), 100, T0, { scrollY: 0 }).resetScroll).toBe(false)
  })

  it('ignores a zero delta', () => {
    expect(wheel(initialStepState(), 0, T0)).toMatchObject({ consume: false })
  })

  it('swallows every event for 600 ms after a step (300 with reduced motion)', () => {
    const s = afterStep()
    expect(wheel(s, -500, T0 + 599, { slide: 1 })).toMatchObject({ consume: true })
    expect(wheel(s, -500, T0 + 599, { slide: 1 }).step).toBeUndefined()
    // A new gesture after the lock is handled normally
    expect(wheel(s, -100, T0 + 600, { slide: 1 }).step).toBe(-1)

    const rm = afterStep(true)
    expect(wheel(rm, -100, T0 + 299, { slide: 1, rm: true }).step).toBeUndefined()
    expect(wheel(rm, -100, T0 + 300, { slide: 1, rm: true }).step).toBe(-1)
  })

  it('recognises the inertia tail: < 120 ms apart, same direction, not growing by more than 1', () => {
    let s = afterStep()
    // Events during the lock keep the tail going
    s = wheel(s, 90, T0 + 500, { slide: 1 }).state
    s = wheel(s, 80, T0 + 580, { slide: 1 }).state
    // After the lock: 119 ms later, |delta| ≤ previous + 1 — still the same gesture, swallowed at the top
    const tail = wheel(s, 81, T0 + 699, { slide: 1 })
    expect(tail).toMatchObject({ consume: true })
    expect(tail.state.tail).toBe(true)
    // Below the top the tail lets the page scroll
    expect(wheel(s, 81, T0 + 699, { slide: 1, scrollY: 10 }).consume).toBe(false)
  })

  it('ends the tail on a gap of 120 ms, a growing delta or a new direction', () => {
    let s = afterStep()
    s = wheel(s, 80, T0 + 580, { slide: 1 }).state
    // 02 + down is not wanted: once the tail ends the page scrolls
    expect(wheel(s, 80, T0 + 700, { slide: 1 })).toMatchObject({ consume: false })
    expect(wheel(s, 80, T0 + 700, { slide: 1 }).state.tail).toBe(false)
    expect(wheel(s, 82, T0 + 650, { slide: 1 })).toMatchObject({ consume: false })
    expect(wheel(s, 81, T0 + 650, { slide: 1 })).toMatchObject({ consume: true })
    expect(wheel(s, -80, T0 + 650, { slide: 1 }).step).toBe(-1)
  })

  it('ends the tail 1800 ms after the step', () => {
    let s = afterStep()
    for (let t = 100; t < 1800; t += 100) s = wheel(s, 10, T0 + t, { slide: 1 }).state
    expect(wheel(s, 10, T0 + 1799, { slide: 1 }).consume).toBe(true)
    expect(wheel(s, 10, T0 + 1800, { slide: 1 }).consume).toBe(false)
  })
})

describe('touchStep', () => {
  const touch = (s: StepState, dy: number, now: number, extra = {}) =>
    touchStep(s, { dy, now, scrollY: 0, slide: 0, rm: false, fired: false, ...extra })

  it('steps once the swipe reaches 24 px', () => {
    expect(touch(initialStepState(), 23, T0)).toMatchObject({ consume: true, fired: false })
    expect(touch(initialStepState(), 23, T0).step).toBeUndefined()
    expect(touch(initialStepState(), 24, T0)).toMatchObject({ consume: true, step: 1, fired: true })
    expect(touch(initialStepState(), -24, T0, { slide: 1 }).step).toBe(-1)
  })

  it('one swipe — one step: after it, touchmove is swallowed until the lock ends', () => {
    const { state } = touch(initialStepState(), 30, T0)
    expect(touch(state, 200, T0 + 599, { slide: 1, fired: true })).toMatchObject({
      consume: true,
      fired: true,
    })
    expect(touch(state, 200, T0 + 599, { slide: 1, fired: true }).step).toBeUndefined()
    expect(touch(state, 200, T0 + 600, { slide: 1, fired: true }).consume).toBe(false)
  })

  it('does not step during the lock, below the top or in an unwanted direction', () => {
    const { state } = touch(initialStepState(), 30, T0)
    expect(touch(state, -30, T0 + 100, { slide: 1 }).step).toBeUndefined()
    expect(touch(initialStepState(), 30, T0, { scrollY: 5 })).toMatchObject({ consume: false })
    expect(touch(initialStepState(), -30, T0)).toMatchObject({ consume: false })
    const rm = touch(initialStepState(), 30, T0, { rm: true }).state
    expect(rm.lockUntil).toBe(T0 + 300)
  })
})

describe('keyDelta', () => {
  const key = (k: string, mods: Partial<Record<'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey', boolean>> = {}) =>
    keyDelta({ key: k, shiftKey: false, metaKey: false, ctrlKey: false, altKey: false, ...mods })

  it('maps the page keys', () => {
    expect(['ArrowDown', 'PageDown', ' '].map((k) => key(k))).toEqual([100, 100, 100])
    expect(['ArrowUp', 'PageUp'].map((k) => key(k))).toEqual([-100, -100])
    expect(key(' ', { shiftKey: true })).toBe(-100)
    expect(key('Enter')).toBe(0)
  })

  it('leaves shortcuts alone', () => {
    expect(key('ArrowDown', { metaKey: true })).toBe(0)
    expect(key('ArrowDown', { ctrlKey: true })).toBe(0)
    expect(key('PageUp', { altKey: true })).toBe(0)
  })
})
