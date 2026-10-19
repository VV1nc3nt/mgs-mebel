import { describe, expect, it } from 'vitest'

import {
  atEnd,
  atStart,
  clampIndex,
  counterParts,
  needsRealign,
  pageStart,
  pageStep,
  snapAlignOf,
} from '@/lib/slider'

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

describe('a track with several photos in view', () => {
  it('pageStart: the active index stops where the last photos share the end', () => {
    expect(pageStart(0, 5, 4)).toBe(0)
    expect(pageStart(1, 5, 4)).toBe(1)
    // After a turn to a wider screen
    expect(pageStart(4, 5, 4)).toBe(1)
    expect(pageStart(3, 5, 1)).toBe(3)
    // Everything in view
    expect(pageStart(1, 2, 2)).toBe(0)
  })

  it('pageStep: a view of photos at a time, stopping at the ends', () => {
    expect(pageStep(0, 1, 5, 4)).toBe(1)
    expect(pageStep(1, 1, 5, 4)).toBe(1)
    expect(pageStep(1, -1, 5, 4)).toBe(0)
    expect(pageStep(0, 1, 7, 3)).toBe(3)
    expect(pageStep(3, 1, 7, 3)).toBe(4)
    expect(pageStep(4, -1, 7, 3)).toBe(1)
    expect(pageStep(0, -1, 5, 1)).toBe(0)
    expect(pageStep(4, 1, 5, 1)).toBe(4)
    expect(pageStep(4, 1, 5, 4)).toBe(1)
  })
})
