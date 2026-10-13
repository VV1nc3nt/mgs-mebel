import { describe, expect, it } from 'vitest'

import { filterScrollTarget, filterUrl, isStuck, parseFilter } from '@/lib/segmentFilter'

const VALUES = ['all', 'kitchens', 'facades'] as const

describe('parseFilter', () => {
  it('a known value, otherwise the fallback', () => {
    expect(parseFilter('kitchens', VALUES, 'all')).toBe('kitchens')
    expect(parseFilter('bathrooms', VALUES, 'all')).toBe('all')
    expect(parseFilter('', VALUES, 'all')).toBe('all')
    expect(parseFilter(null, VALUES, 'all')).toBe('all')
  })
})

describe('filterUrl', () => {
  it('sets the parameter, keeps the others and the hash', () => {
    expect(filterUrl('https://x.ru/catalogs?a=1#top', 'category', 'kitchens', 'all')).toBe(
      '/catalogs?a=1&category=kitchens#top',
    )
  })

  it('the fallback removes the parameter', () => {
    expect(filterUrl('https://x.ru/catalogs?category=kitchens', 'category', 'all', 'all')).toBe(
      '/catalogs',
    )
  })
})

describe('isStuck', () => {
  it('the bar has left its place', () => {
    expect(isStuck(300, 300)).toBe(false)
    expect(isStuck(300.2, 300)).toBe(false)
    expect(isStuck(-500, 0)).toBe(true)
    expect(isStuck(-500, 80)).toBe(true)
  })
})

describe('filterScrollTarget', () => {
  it('pinned header: the bar back at its place under it, rounded up', () => {
    expect(filterScrollTarget({ y: 1400, barY: 399.75, headerH: 80, pinned: true })).toBe(320)
    // A small scroll keeps the pinned header
    expect(filterScrollTarget({ y: 323, barY: 400, headerH: 80, pinned: true })).toBe(320)
  })

  it('header away: a scroll up beyond the threshold pins it — under the header', () => {
    expect(filterScrollTarget({ y: 1400, barY: 400, headerH: 80, pinned: false })).toBe(320)
  })

  it('header away and a scroll of 6 px or less: it stays away — the bar at the top edge', () => {
    expect(filterScrollTarget({ y: 406, barY: 404, headerH: 4, pinned: false })).toBe(404)
  })

  it('never above the page top', () => {
    expect(filterScrollTarget({ y: 100, barY: 40, headerH: 80, pinned: true })).toBe(0)
  })
})
