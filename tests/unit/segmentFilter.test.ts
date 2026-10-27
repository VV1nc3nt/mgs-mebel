import { describe, expect, it } from 'vitest'

import { filterUrl, parseFilter } from '@/lib/segmentFilter'

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
