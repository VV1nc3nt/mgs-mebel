import type { Media } from '@/payload-types'

const size = (name: string, width: number, height: number) => ({
  url: `/api/media/file/kitchen-${name}.jpg`,
  width,
  height,
  mimeType: 'image/jpeg',
})

export const photo: Media = {
  id: 1,
  alt: 'Светлая кухня с белыми фасадами',
  url: '/api/media/file/kitchen.jpg',
  mimeType: 'image/jpeg',
  width: 2400,
  height: 1600,
  focalX: 30,
  focalY: 70,
  sizes: {
    thumb: size('480x320', 480, 320),
    card: size('960x640', 960, 640),
    hero: size('1920x1280', 1920, 1280),
  },
  updatedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
}

export const video: Media = {
  ...photo,
  id: 2,
  alt: null,
  url: '/api/media/file/hero.mp4',
  mimeType: 'video/mp4',
  width: null,
  height: null,
  sizes: {},
}
