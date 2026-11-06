import { describe, expect, it } from 'vitest'
import { analyticsUrl, publicAnalyticsPath } from '@/lib/metrika'
import { mapPanDelta, salonCoordinates, salonMapHref, salonMapLocation } from '@/lib/salonMap'

describe('salon map data', () => {
  it('pans only enough to reveal an obscured marker', () => {
    expect(mapPanDelta(100, 100, 350, 436, 250)).toEqual([0, 0])
    expect(mapPanDelta(100, 300, 350, 436, 250)).toEqual([0, 114])
    expect(mapPanDelta(-20, 100, 350, 436, 250)).toEqual([-60, 0])
  })
  it('accepts zero and returns longitude before latitude', () => {
    expect(salonCoordinates({ lat: 0, lng: 37 })).toEqual([37, 0])
    for (const location of [
      null,
      {},
      { lat: 55 },
      { lat: NaN, lng: 0 },
      { lat: 91, lng: 10 },
      { lat: 0, lng: Infinity },
    ]) {
      expect(salonCoordinates(location)).toBeNull()
    }
    expect(salonMapHref({ lat: 55, lng: 37 })).toContain('pt=37%2C55')
    expect(salonMapHref({ lat: 55 })).toBeUndefined()
  })
  it('fits all points and handles coincident coordinates', () => {
    expect(
      salonMapLocation([
        [37, 55],
        [38, 54],
      ]),
    ).toEqual({
      bounds: [
        [37, 54],
        [38, 55],
      ],
    })
    expect(
      salonMapLocation([
        [37, 55],
        [37, 55],
      ]),
    ).toEqual({ center: [37, 55], zoom: 12 })
  })
})

describe('analytics addresses', () => {
  it('preserves campaigns while removing private and UI state', () => {
    expect(
      analyticsUrl(
        'https://example.org/works?reel=x&photo=2&item=1&category=kitchen&utm_source=yandex&yclid=42&secret=bad#photo',
      ),
    ).toBe('https://example.org/works?utm_source=yandex&yclid=42')
  })
  it('only allows public page shapes', () => {
    for (const path of ['/', '/about', '/salons', '/works/p', '/news/p', '/privacy'])
      expect(publicAnalyticsPath(path)).toBe(true)
    for (const path of [
      '/admin',
      '/api/users',
      '/preview',
      '/ui-kit',
      '/healthz',
      '/news/x/y',
      '/unknown',
    ])
      expect(publicAnalyticsPath(path)).toBe(false)
  })
})
