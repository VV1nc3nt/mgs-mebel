import { describe, expect, it } from 'vitest'

import type { Media } from '@/payload-types'
import {
  areaFact,
  canScrollInside,
  frameWindow,
  isProjectSlug,
  jumpProject,
  mediaFact,
  nextFrame,
  pageOf,
  pendingStep,
  playRefusal,
  prevFrame,
  progressShare,
  projectFacts,
  projectSubtitle,
  shouldLoadMore,
  slugFromPath,
  swipeMove,
  swipeStep,
  toViewerFrames,
  toViewerProject,
  videoEvent,
  viewerCounter,
  type ProjectRecord,
  type ViewerBounds,
} from '@/lib/viewer'

const media = (id: number, mimeType: string) =>
  ({ id, url: `/m/${id}`, mimeType, filename: `${id}`, alt: `m${id}` }) as unknown as Media
const photo = (id: number) => ({ type: 'photo' as const, file: media(id, 'image/jpeg') })
const video = {
  type: 'video' as const,
  file: media(9, 'video/mp4'),
  poster: media(8, 'image/jpeg'),
  duration: 12,
}

const record = (extra: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: 1,
  title: 'Кухня-остров',
  slug: 'kuhnya-ostrov-1',
  category: 'kitchens',
  place: 'ЖК «Остров»',
  area: 42,
  duration: '4 недели',
  description: 'Описание',
  slides: [video, photo(1), photo(2)],
  meta: undefined,
  order: 1,
  createdAt: '2026-10-01T00:00:00.000Z',
  ...extra,
})

describe('view-model', () => {
  it('frames: the poster of a video, photos; broken slides left out', () => {
    const frames = toViewerFrames([video, photo(1), { type: 'photo', file: 5 }])
    expect(frames.map((f) => [f.kind, f.image?.id, f.video?.src ?? null, f.duration])).toEqual([
      ['video', 8, '/m/9', 12],
      ['photo', 1, null, null],
    ])
  })

  it('facts: area, duration, media; empty ones left out', () => {
    expect(areaFact(42)).toBe('42 м²')
    expect(areaFact(42.5)).toBe('42,5 м²')
    expect(areaFact(null)).toBeNull()
    expect(mediaFact([{ kind: 'video' }, { kind: 'photo' }])).toBe('видео + фото')
    expect(mediaFact([{ kind: 'video' }])).toBe('видео')
    expect(mediaFact([{ kind: 'photo' }])).toBe('1 фото')
    expect(mediaFact(Array.from({ length: 5 }, () => ({ kind: 'photo' as const })))).toBe('5 фото')
    expect(projectFacts({ area: null, duration: '  ' }, [])).toEqual([])
  })

  it('project: title of the page, category label, subtitle', () => {
    const p = toViewerProject(record())
    expect(p).toMatchObject({
      href: '/works/kuhnya-ostrov-1',
      documentTitle: 'Кухня-остров — MGS MEBEL',
      category: 'Кухни',
      facts: ['42 м²', '4 недели', 'видео + фото'],
    })
    expect(toViewerProject(record({ meta: { title: 'SEO' } })).documentTitle).toBe(
      'SEO — MGS MEBEL',
    )
    expect(projectSubtitle(p)).toBe('Кухни · ЖК «Остров»')
    expect(projectSubtitle(toViewerProject(record({ place: '' })))).toBe('Кухни')
    expect(viewerCounter(2, 30)).toBe('3 / 30')
  })

  it('slugs and paths', () => {
    expect(isProjectSlug('kuhnya-ostrov-1')).toBe(true)
    for (const bad of ['', 'A', 'a--b', '-a', 'a/b', '../x', 'a'.repeat(1001), 5, null]) {
      expect(isProjectSlug(bad)).toBe(false)
    }
    expect(slugFromPath('/works/kuhnya-1')).toBe('kuhnya-1')
    expect(slugFromPath('/works')).toBeNull()
    expect(slugFromPath('/works/a/b')).toBeNull()
    expect([pageOf(0), pageOf(11), pageOf(12)]).toEqual([1, 1, 2])
  })
})

describe('navigation', () => {
  const bounds = (extra: Partial<ViewerBounds> = {}): ViewerBounds => ({
    frames: 3,
    length: 5,
    hasMore: false,
    ...extra,
  })

  it('frames forward and back within a project', () => {
    expect(nextFrame({ index: 1, frame: 0 }, bounds())).toEqual({ type: 'frame', frame: 1 })
    expect(prevFrame({ index: 1, frame: 2 }, bounds())).toEqual({ type: 'frame', frame: 1 })
  })

  it('after the last frame the next project; before the first the previous', () => {
    expect(nextFrame({ index: 1, frame: 2 }, bounds())).toEqual({ type: 'project', index: 2 })
    expect(prevFrame({ index: 1, frame: 0 }, bounds())).toEqual({ type: 'project', index: 0 })
    expect(prevFrame({ index: 0, frame: 0 }, bounds())).toEqual({ type: 'none' })
  })

  it('the last frame of the whole feed closes; of the loaded part loads more', () => {
    expect(nextFrame({ index: 4, frame: 2 }, bounds())).toEqual({ type: 'close' })
    expect(nextFrame({ index: 4, frame: 2 }, bounds({ hasMore: true }))).toEqual({ type: 'load' })
  })

  it('frames still loading: taps do nothing', () => {
    expect(nextFrame({ index: 1, frame: 0 }, bounds({ frames: null }))).toEqual({ type: 'none' })
    expect(prevFrame({ index: 1, frame: 0 }, bounds({ frames: null }))).toEqual({ type: 'none' })
  })

  it('↑ on the first and ↓ on the last of the feed do nothing', () => {
    expect(jumpProject({ index: 0, frame: 1 }, -1, bounds())).toEqual({ type: 'none' })
    expect(jumpProject({ index: 4, frame: 0 }, 1, bounds())).toEqual({ type: 'none' })
    expect(jumpProject({ index: 4, frame: 0 }, 1, bounds({ hasMore: true }))).toEqual({
      type: 'load',
    })
    expect(jumpProject({ index: 2, frame: 2 }, 1, bounds())).toEqual({ type: 'project', index: 3 })
  })

  it('preloads with two projects or fewer left', () => {
    expect(shouldLoadMore(2, 5, true)).toBe(true)
    expect(shouldLoadMore(1, 5, true)).toBe(false)
    expect(shouldLoadMore(4, 5, false)).toBe(false)
  })

  it('a pending step: go when loaded, wait while loading, drop after a failed load', () => {
    expect(pendingStep(5, { length: 17, loading: false })).toBe('go')
    expect(pendingStep(5, { length: 5, loading: true })).toBe('wait')
    expect(pendingStep(5, { length: 5, loading: false })).toBe('drop')
  })
})

describe('gestures', () => {
  it('a vertical swipe over 60 px changes the project', () => {
    expect(swipeStep({ dx: 0, dy: -61 })).toBe(1)
    expect(swipeStep({ dx: 10, dy: 80 })).toBe(-1)
    expect(swipeStep({ dx: 0, dy: -60 })).toBe(0)
    expect(swipeStep({ dx: 90, dy: 80 })).toBe(0)
  })

  it('down on the first project closes', () => {
    const b = { frames: 3, length: 5, hasMore: false }
    expect(swipeMove({ index: 0, frame: 1 }, -1, b)).toEqual({ type: 'close' })
    expect(swipeMove({ index: 2, frame: 1 }, -1, b)).toEqual({ type: 'project', index: 1 })
  })

  it('a box scrolls inside while it can', () => {
    const box = { scrollTop: 0, scrollHeight: 300, clientHeight: 100 }
    expect(canScrollInside(box, 1)).toBe(true)
    expect(canScrollInside(box, -1)).toBe(false)
    expect(canScrollInside({ ...box, scrollTop: 200 }, 1)).toBe(false)
    expect(canScrollInside({ ...box, scrollTop: 200 }, -1)).toBe(true)
  })
})

describe('video', () => {
  it('frame window: the current frame and its neighbours', () => {
    expect(frameWindow(0, 1)).toEqual([0])
    expect(frameWindow(0, 4)).toEqual([0, 1])
    expect(frameWindow(2, 4)).toEqual([1, 2, 3])
    expect(frameWindow(3, 4)).toEqual([2, 3])
    expect(frameWindow(0, 0)).toEqual([])
  })

  it('progress: the share of the file played, unknown length — 0', () => {
    expect(progressShare(5, 10)).toBe(0.5)
    expect(progressShare(12, 10)).toBe(1)
    expect(progressShare(-1, 10)).toBe(0)
    expect(progressShare(3, NaN)).toBe(0)
    expect(progressShare(3, Infinity)).toBe(0)
    expect(progressShare(3, 0)).toBe(0)
    expect(progressShare(NaN, 10)).toBe(0)
  })

  it('events: playing shows, ended steps, failures before playing give the poster back', () => {
    expect(videoEvent('playing', { started: false })).toBe('play')
    expect(videoEvent('ended', { started: true })).toBe('advance')
    expect(videoEvent('error', { started: true })).toBe('fallback')
    expect(videoEvent('stalled', { started: false })).toBe('fallback')
    expect(videoEvent('stalled', { started: true })).toBe('none')
    expect(videoEvent('timeout', { started: false })).toBe('fallback')
    expect(videoEvent('timeout', { started: true })).toBe('none')
  })

  it('a refused play(): abort is ignored, with sound — muted again, muted — the poster', () => {
    const abort = Object.assign(new Error('x'), { name: 'AbortError' })
    const policy = Object.assign(new Error('x'), { name: 'NotAllowedError' })
    expect(playRefusal(abort, false)).toBe('ignore')
    expect(playRefusal(abort, true)).toBe('ignore')
    expect(playRefusal(policy, false)).toBe('retry-muted')
    expect(playRefusal(policy, true)).toBe('fallback')
    expect(playRefusal(undefined, true)).toBe('fallback')
  })
})
