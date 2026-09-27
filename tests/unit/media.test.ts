import { describe, expect, it } from 'vitest'

import { focalPosition, imageSizes, imageSource, isImage, isVideo } from '@/lib/media'
import { photo, video } from './fixtures'

describe('lib/media', () => {
  it('tells images from videos and ignores unpopulated ids', () => {
    expect(isImage(photo)).toBe(true)
    expect(isVideo(video)).toBe(true)
    expect(isImage(1)).toBe(false)
    expect(isImage(null)).toBe(false)
  })

  it('picks the requested size with its dimensions and alt', () => {
    expect(imageSource(photo, 'card')).toEqual({
      src: '/api/media/file/kitchen-960x640.jpg',
      width: 960,
      height: 640,
      alt: 'Светлая кухня с белыми фасадами',
    })
  })

  it('falls back to a larger size, then to the original', () => {
    const small = { ...photo, sizes: { ...photo.sizes, thumb: {}, card: {} } }
    expect(imageSource(small, 'thumb')?.width).toBe(1920)
    const original = { ...photo, sizes: {} }
    expect(imageSource(original, 'hero')?.src).toBe('/api/media/file/kitchen.jpg')
  })

  it('returns null for videos and missing media', () => {
    expect(imageSource(video, 'card')).toBeNull()
    expect(imageSource(7, 'card')).toBeNull()
  })

  it('builds sizes widest breakpoint first', () => {
    expect(imageSizes({ base: '100vw', md: '50vw', xl: '33vw' })).toBe(
      '(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw',
    )
    expect(imageSizes({ base: '100vw' })).toBe('100vw')
  })

  it('uses the focal point for object-position', () => {
    expect(focalPosition(photo)).toBe('30% 70%')
    expect(focalPosition(null)).toBe('50% 50%')
  })
})
