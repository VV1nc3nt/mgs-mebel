import { describe, expect, it } from 'vitest'

import { plural } from '@/lib/plural'

const WORKS = ['работа', 'работы', 'работ'] as const

describe('plural', () => {
  it.each([
    [0, 'работ'],
    [1, 'работа'],
    [2, 'работы'],
    [4, 'работы'],
    [5, 'работ'],
    [11, 'работ'],
    [12, 'работ'],
    [14, 'работ'],
    [21, 'работа'],
    [22, 'работы'],
    [60, 'работ'],
    [101, 'работа'],
    [111, 'работ'],
  ])('%i → %s', (n, form) => {
    expect(plural(n, WORKS)).toBe(form)
  })
})
