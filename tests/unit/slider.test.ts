import { describe, expect, it } from 'vitest'

import { atEnd, atStart, clampIndex, counterParts, needsRealign, snapAlignOf } from '@/lib/slider'

describe('slider helpers', () => {
  it('clampIndex keeps the index inside the slides, 0 without slides', () => {
    expect(clampIndex(-1, 3)).toBe(0)
    expect(clampIndex(1, 3)).toBe(1)
    expect(clampIndex(3, 3)).toBe(2)
    expect(clampIndex(2, 0)).toBe(0)
  })

  it('atStart / atEnd: the arrows that stop at the ends', () => {
    expect(atStart(0)).toBe(true)
    expect(atStart(1)).toBe(false)
    expect(atEnd(2, 3)).toBe(true)
    expect(atEnd(1, 3)).toBe(false)
    // One slide is both ends
    expect(atStart(0) && atEnd(0, 1)).toBe(true)
  })

  it('snapAlignOf reads the inline axis of a computed scroll-snap-align', () => {
    expect(snapAlignOf('start')).toBe('start')
    expect(snapAlignOf('center')).toBe('center')
    expect(snapAlignOf('none center')).toBe('center')
    expect(snapAlignOf('center start')).toBe('start')
    expect(snapAlignOf('none')).toBe('start')
    expect(snapAlignOf(undefined)).toBe('start')
  })

  it('needsRealign: a pixel or more off the target', () => {
    expect(needsRealign(100, 100)).toBe(false)
    expect(needsRealign(100, 99.5)).toBe(false)
    expect(needsRealign(100, 99)).toBe(true)
    expect(needsRealign(0, 12)).toBe(true)
  })

  it('counterParts: «01 / 04»', () => {
    expect(counterParts(0, 4)).toEqual(['01', '04'])
    expect(counterParts(9, 12)).toEqual(['10', '12'])
  })
})
