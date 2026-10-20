import { describe, expect, it } from 'vitest'

import {
  FALLBACK_RATIO,
  gridVars,
  masonry,
  masonryHeight,
  masonryLayouts,
  tileRatio,
  tileVars,
} from '@/lib/masonry'
import { itemLabel, itemTitle } from '@/lib/workItems'
import {
  buildFeeds,
  feedChips,
  feedCounts,
  mediaBadge,
  REEL_RATIO,
  worksCount,
  type ItemRow,
  type ProjectRow,
} from '@/lib/works'
import { isWorkType, workTypeCta, workTypeLabel, workTypes } from '@/lib/workTypes'
import type { Media } from '@/payload-types'
import { photo, video } from './fixtures'

const posterVideo: Media = { ...video, poster: photo }
const wide: Media = { ...photo, id: 3, width: 1600, height: 1200 }

const project = (id: number, extra: Partial<ProjectRow> = {}): ProjectRow => ({
  id,
  title: `Проект ${id}`,
  slug: `proekt-${id}`,
  place: `ЖК ${id}`,
  complex: true,
  cover: null,
  videos: [],
  featured: false,
  hidden: false,
  ...extra,
})

const item = (id: number, extra: Partial<ItemRow> = {}): ItemRow => ({
  id,
  title: null,
  type: 'kitchens',
  project: null,
  place: null,
  photos: [photo],
  videos: [],
  featured: false,
  hidden: false,
  ...extra,
})

describe('item types', () => {
  it('have singular and plural labels and the CTA by gender', () => {
    expect(workTypes.map((t) => t.value)).toEqual([
      'kitchens',
      'livingrooms',
      'bathrooms',
      'hallways',
      'wardrobes',
      'bedrooms',
      'kids',
    ])
    expect(workTypeLabel('bathrooms')).toBe('Санузел')
    expect(workTypeLabel('nope')).toBeUndefined()
    expect(workTypeCta('kitchens')).toBe('Хочу такую же')
    expect(workTypeCta('bathrooms')).toBe('Хочу такой же')
    expect(isWorkType('kids')).toBe(true)
    expect(isWorkType('complex')).toBe(false)
  })

  it('name an item by its title or type, with its project in the admin', () => {
    expect(itemTitle({ title: '  ', type: 'kitchens' })).toBe('Кухня')
    expect(itemTitle({ title: 'Кабинет', type: 'livingrooms' })).toBe('Кабинет')
    expect(itemLabel({ type: 'kitchens' }, 'Квартира в тёплых тонах')).toBe(
      'Кухня — Квартира в тёплых тонах',
    )
    expect(itemLabel({ title: 'Кухня в загородный дом', type: 'kitchens' })).toBe(
      'Кухня в загородный дом',
    )
  })
})

describe('counters and badges', () => {
  it('count projects, works and videos with Russian plurals', () => {
    expect(worksCount(1, 'complex')).toBe('1 проект')
    expect(worksCount(3, 'complex')).toBe('3 проекта')
    expect(worksCount(6, 'complex')).toBe('6 проектов')
    expect(worksCount(11, 'complex')).toBe('11 проектов')
    expect(worksCount(21, 'kitchens')).toBe('21 работа')
    expect(worksCount(14, 'kitchens')).toBe('14 работ')
    expect(worksCount(22, 'bedrooms')).toBe('22 работы')
    expect(worksCount(7, 'reels')).toBe('7 видео')
  })

  it('show photos and videos of a tile', () => {
    expect(mediaBadge(13, 3)).toBe('13 фото + 3 видео')
    expect(mediaBadge(13, 0)).toBe('13 фото')
    expect(mediaBadge(0, 2)).toBe('2 видео')
    expect(mediaBadge(0, 0)).toBe('')
  })
})

describe('buildFeeds', () => {
  it('«Комплекс»: complex projects with visible items; counts their photos and videos', () => {
    const feeds = buildFeeds(
      [
        project(1, { videos: [posterVideo] }),
        project(2),
        project(3, { complex: false }),
        project(4, { hidden: true }),
      ],
      [
        item(10, { project: 1, photos: [photo, wide], videos: [posterVideo] }),
        item(11, { project: 1, type: 'bathrooms' }),
        item(12, { project: 2, hidden: true }),
        item(13, { project: 3 }),
        item(14, { project: 4 }),
      ],
    )
    expect(feeds.complex.map((t) => t.key)).toEqual(['p-1'])
    expect(feeds.complex[0]).toMatchObject({
      kind: 'project',
      href: '/works/proekt-1',
      place: 'ЖК 1',
      photos: 3,
      videos: 2,
      image: photo,
    })
    // A hidden project hides its items; a non-complex project still has its items in the feeds
    expect(feeds.kitchens.map((t) => t.key)).toEqual(['i-10', 'i-13'])
    expect(feeds.bathrooms.map((t) => t.key)).toEqual(['i-11'])
  })

  it('a project cover wins over the first photo of its first item', () => {
    const feeds = buildFeeds([project(1, { cover: wide })], [item(10, { project: 1 })])
    expect(feeds.complex[0]!.image).toBe(wide)
    expect(feeds.complex[0]!.ratio).toBeCloseTo(0.75)
  })

  it('an item: its own title or the type, the project’s place or its own', () => {
    const feeds = buildFeeds(
      [project(1)],
      [
        item(10, { project: 1 }),
        item(11, { title: 'Кухня в загородный дом', place: 'Химки' }),
        item(12, { title: 'Без места' }),
      ],
    )
    expect(feeds.kitchens.map((t) => (t.kind === 'item' ? [t.title, t.place] : []))).toEqual([
      ['Кухня', 'ЖК 1'],
      ['Кухня в загородный дом', 'Химки'],
      ['Без места', null],
    ])
  })

  it('REELS: per project its videos, then its items’ videos; then separate works', () => {
    const feeds = buildFeeds(
      [project(1, { videos: [posterVideo] }), project(2)],
      [
        item(20, { videos: [{ ...posterVideo, id: 7 }] }),
        item(10, { project: 1, type: 'wardrobes', videos: [{ ...posterVideo, id: 8 }] }),
        item(11, { project: 2, type: 'bathrooms', videos: [{ ...posterVideo, id: 9 }] }),
      ],
    )
    expect(feeds.reels.map((t) => t.key)).toEqual(['r-p-1-2', 'r-i-10-8', 'r-i-11-9', 'r-i-20-7'])
    expect(feeds.reels.map((t) => (t.kind === 'reel' ? t.type : null))).toEqual([
      null,
      'wardrobes',
      'bathrooms',
      'kitchens',
    ])
    expect(feeds.reels[0]).toMatchObject({ image: photo, ratio: REEL_RATIO })
  })

  it('a video without a poster (removed after saving) is left out, nothing fails', () => {
    const bare = { ...video, poster: null }
    const unpopulated = { ...video, poster: 5 }
    const feeds = buildFeeds([], [item(10, { videos: [bare, unpopulated, posterVideo] })])
    expect(feeds.reels).toHaveLength(1)
    expect(feeds.kitchens[0]).toMatchObject({ photos: 1, videos: 1 })
  })

  it('chips: feeds with tiles in the design order; the numbers per feed', () => {
    const feeds = buildFeeds([project(1)], [item(10, { project: 1, type: 'kids' })])
    const counts = feedCounts(feeds)
    expect(counts).toMatchObject({ complex: 1, kids: 1, reels: 0, kitchens: 0 })
    expect(feedChips(counts).map((c) => c.value)).toEqual(['complex', 'kids'])
  })
})

describe('masonry', () => {
  it('puts each tile in the shortest column (gaps count), the leftmost on a tie', () => {
    const { places, columns } = masonry([1, 2, 1, 1, 1], 2)
    // After three tiles both columns are 2 high, but the left one has one more gap
    expect(places.map((p) => p.column)).toEqual([0, 1, 0, 1, 0])
    expect(places[3]).toEqual({ column: 1, top: 2, above: 1 })
    expect(columns).toEqual([
      { units: 3, count: 3 },
      { units: 3, count: 2 },
    ])
  })

  it('fills the first row from the left: the reading order is by rows', () => {
    for (const count of [2, 3, 4] as const) {
      const { places } = masonry([1.33, 0.75, 1, 1.25, 1.33], count)
      expect(places.slice(0, count).map((p) => p.column)).toEqual([...Array(count).keys()])
      for (const p of places.slice(0, count)) expect(p.top).toBe(0)
    }
  })

  it('is stable: the same tiles give the same layout', () => {
    const ratios = [1.33, 0.75, 1, 1.25, 1.33, 0.75, 1.777]
    expect(masonryLayouts(ratios)).toEqual(masonryLayouts([...ratios]))
  })

  it('keeps unknown image sizes at 4:5', () => {
    expect(tileRatio(null, 100)).toBe(FALLBACK_RATIO)
    expect(tileRatio(1600, 1200)).toBe(0.75)
  })

  it('writes the place and the list height as custom properties', () => {
    const layouts = masonryLayouts([1, 2, 1])
    expect(tileVars(1, layouts, 2)).toEqual({
      '--r': 1,
      '--c2': 0,
      '--t2': 1,
      '--k2': 1,
      '--c3': 2,
      '--t3': 0,
      '--k3': 0,
      '--c4': 2,
      '--t4': 0,
      '--k4': 0,
    })
    expect(masonryHeight(layouts[0]!)).toBe(
      'max(calc(2 * var(--cw) + 1 * var(--gy)), calc(2 * var(--cw) + 0 * var(--gy)))',
    )
    expect(gridVars(masonryLayouts([]))).toEqual({ '--h2': '0', '--h3': '0', '--h4': '0' })
  })
})
