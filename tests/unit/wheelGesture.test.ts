import { describe, expect, it } from 'vitest'

import {
  initialStepState,
  KEY_DELTA,
  LOCK,
  LOCK_RM,
  STEP_DELTA,
  TAIL_SPAN,
  wheelGesture,
  type StepState,
} from '@/lib/wheelGesture'

const T0 = 10_000
const on = { rm: false, active: true, wants: true }
const wheel = (s: StepState, dy: number, now: number, extra: Partial<typeof on> = {}) =>
  wheelGesture(s, { dy, now, ...on, ...extra })

describe('wheelGesture', () => {
  it('keeps the numbers of the home hero', () => {
    expect([STEP_DELTA, LOCK, LOCK_RM, TAIL_SPAN, KEY_DELTA]).toEqual([24, 600, 300, 1800, 100])
  })

  it('one tick of 24 is one step; 23 is not', () => {
    expect(wheel(initialStepState(), 23, T0)).toMatchObject({ consume: true, counted: true })
    expect(wheel(initialStepState(), 23, T0).step).toBeUndefined()
    expect(wheel(initialStepState(), -24, T0)).toMatchObject({ step: -1, counted: true })
  })

  it('a trackpad swipe with inertia makes one step', () => {
    let s = initialStepState()
    const steps: number[] = []
    // 40 events 16 ms apart, deltas fading 60 → 2: one gesture of about 640 ms
    for (let i = 0; i < 40; i++) {
      const r = wheel(s, Math.max(2, 60 - i * 1.5), T0 + i * 16)
      s = r.state
      if (r.step) steps.push(r.step)
    }
    expect(steps).toEqual([1])
  })

  it('the next separate gesture after the lock steps again', () => {
    const s = wheel(initialStepState(), 100, T0).state
    expect(wheel(s, 100, T0 + LOCK - 1).step).toBeUndefined()
    expect(wheel(s, 100, T0 + LOCK + 200).step).toBe(1)
  })

  it('a shorter lock with reduced motion', () => {
    const s = wheel(initialStepState(), 100, T0, { rm: true }).state
    expect(wheel(s, 100, T0 + LOCK_RM + 200, { rm: true }).step).toBe(1)
  })

  it('inactive or unwanted: not consumed, no step', () => {
    expect(wheel(initialStepState(), 100, T0, { active: false })).toMatchObject({
      consume: false,
      counted: false,
    })
    expect(wheel(initialStepState(), 100, T0, { wants: false }).step).toBeUndefined()
  })
})
