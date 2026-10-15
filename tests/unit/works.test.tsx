import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSyncExternalStore } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkCard } from '@/components/works/WorkCard'
import { WorksFeed } from '@/components/works/WorksFeed'
import { WorksView } from '@/components/works/WorksView'
import { parseFilter } from '@/lib/segmentFilter'
import {
  ALL_WORKS,
  WORKS_FEED_FILTERS,
  WORKS_MAX_PAGE,
  appendWorks,
  feedPage,
  toFeedWork,
  toWorkPreview,
  worksChips,
  worksCount,
  type ProjectRow,
  type WorksCounts,
  type WorksFeedFilter,
  type WorksFeedPage,
} from '@/lib/works'
import { photo, video } from './fixtures'
import { intersect } from './setup'

// useSearchParams follows the URL replaced through history.replaceState, as in Next.js
const url = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  return {
    search: '',
    set(search: string) {
      this.search = search
      for (const listener of listeners) listener()
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
})
vi.mock('next/navigation', () => ({
  usePathname: () => '/works',
  useSearchParams: () =>
    new URLSearchParams(
      useSyncExternalStore(
        (l) => url.subscribe(l),
        () => url.search,
        () => url.search,
      ),
    ),
}))

// The Server Action and the queries behind it
const queries = vi.hoisted(() => ({ getWorksCounts: vi.fn(), getWorksPage: vi.fn() }))
vi.mock('@/lib/queries', () => queries)
const action = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/app/(frontend)/works/actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/(frontend)/works/actions')>()
  return { ...actual, loadProjects: (input: unknown) => action.load(input) }
})

const project = (
  id: number,
  category: ProjectRow['category'] = 'complex',
  kind: 'photo' | 'video' = 'photo',
): ProjectRow => ({
  id,
  title: `Работа ${id}`,
  slug: `rabota-${id}`,
  category,
  slides:
    kind === 'video'
      ? [
          { type: 'video', file: video, poster: photo },
          { type: 'photo', file: { ...photo, id: 99 } },
        ]
      : [
          { type: 'photo', file: photo },
          { type: 'photo', file: { ...photo, id: 99 } },
        ],
})

const works = (from: number, n: number, category: ProjectRow['category'] = 'complex') =>
  Array.from({ length: n }, (_, i) => toFeedWork(project(from + i, category)))

const COUNTS: WorksCounts = {
  all: 30,
  reels: 20,
  complex: 12,
  kitchens: 3,
  hallways: 3,
  bedrooms: 3,
  bathrooms: 0,
  wardrobes: 3,
  livingrooms: 6,
}

describe('works feed helpers', () => {
  it('the counter: работа / работы / работ, with the chip', () => {
    expect([1, 3, 12, 21, 22, 30].map((n) => worksCount(n, ALL_WORKS))).toEqual([
      '1 работа',
      '3 работы',
      '12 работ',
      '21 работа',
      '22 работы',
      '30 работ',
    ])
    expect(worksCount(12, 'complex')).toBe('12 работ · комплекс')
    expect(worksCount(3, 'kitchens')).toBe('3 работы · кухни')
    expect(worksCount(20, 'reels')).toBe('20 работ · reels')
    expect(worksCount(1, 'bathrooms')).toBe('1 работа · санузлы')
  })

  it('chips: «все», reels and the categories with works, in order; none without works', () => {
    expect(worksChips(COUNTS).map((chip) => chip.value)).toEqual([
      'all',
      'reels',
      'complex',
      'kitchens',
      'hallways',
      'bedrooms',
      'wardrobes',
      'livingrooms',
    ])
    expect(worksChips(COUNTS)[0]!.label).toBe('все')
    expect(worksChips({ ...COUNTS, reels: 0 }).map((c) => c.value)).not.toContain('reels')
    const none = Object.fromEntries(WORKS_FEED_FILTERS.map((f) => [f, 0])) as WorksCounts
    expect(worksChips(none)).toEqual([])
  })

  it('the filter from the URL: a chip without works, unknown or empty is «все»', () => {
    const values = worksChips(COUNTS).map((chip) => chip.value)
    expect(parseFilter('kitchens', values, ALL_WORKS)).toBe('kitchens')
    expect(parseFilter('reels', values, ALL_WORKS)).toBe('reels')
    expect(parseFilter('bathrooms', values, ALL_WORKS)).toBe('all')
    expect(parseFilter('unknown', values, ALL_WORKS)).toBe('all')
    expect(parseFilter('', values, ALL_WORKS)).toBe('all')
    expect(parseFilter(null, values, ALL_WORKS)).toBe('all')
  })

  it('a feed card: the poster or the first photo, the project page link', () => {
    const reel = toFeedWork(project(1, 'bathrooms', 'video'))
    expect(reel).toEqual({
      id: 1,
      slug: 'rabota-1',
      title: 'Работа 1',
      category: 'Санузлы',
      href: '/works/rabota-1',
      image: photo,
      kind: 'video',
    })
    expect(toFeedWork(project(2, 'hallways'))).toMatchObject({ kind: 'photo', image: photo })
    // The home previews open the project page too
    expect(toWorkPreview(project(2, 'hallways')).href).toBe('/works/rabota-2')
  })

  it('a page: an integer from 1 within the works, at most WORKS_MAX_PAGE', () => {
    expect(feedPage(1, 30)).toBe(1)
    expect(feedPage(3, 30)).toBe(3)
    expect(feedPage(4, 30)).toBeNull()
    expect(feedPage(1, 0)).toBeNull()
    expect(feedPage(0, 30)).toBeNull()
    expect(feedPage(-1, 30)).toBeNull()
    expect(feedPage(1.5, 30)).toBeNull()
    expect(feedPage('2', 30)).toBeNull()
    expect(feedPage(Number.NaN, 30)).toBeNull()
    expect(feedPage(WORKS_MAX_PAGE, 1e9)).toBe(WORKS_MAX_PAGE)
    expect(feedPage(WORKS_MAX_PAGE + 1, 1e9)).toBeNull()
  })

  it('appending a page drops the cards already in the feed', () => {
    expect(appendWorks(works(1, 3), works(3, 3)).map((w) => w.id)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('loadProjects', () => {
  beforeEach(() => {
    queries.getWorksCounts.mockReset().mockResolvedValue(COUNTS)
    queries.getWorksPage.mockReset().mockResolvedValue({ items: [], hasMore: true })
  })

  it('reads the page of a known filter; an unknown one is «все»', async () => {
    const { loadProjects } = await vi.importActual<typeof import('@/app/(frontend)/works/actions')>(
      '@/app/(frontend)/works/actions',
    )
    await loadProjects({ page: 2, category: 'reels' })
    expect(queries.getWorksPage).toHaveBeenLastCalledWith('reels', 2)
    await loadProjects({ page: 3, category: 'all' })
    expect(queries.getWorksPage).toHaveBeenLastCalledWith('all', 3)
    await loadProjects({ page: 1, category: 'unknown' })
    expect(queries.getWorksPage).toHaveBeenLastCalledWith('all', 1)
    await loadProjects({ page: 1, category: { toString: () => 'reels' } })
    expect(queries.getWorksPage).toHaveBeenLastCalledWith('all', 1)
  })

  it('answers empty before the cache for a page past the end or an invalid one', async () => {
    const { loadProjects } = await vi.importActual<typeof import('@/app/(frontend)/works/actions')>(
      '@/app/(frontend)/works/actions',
    )
    for (const input of [
      { page: 2, category: 'kitchens' },
      { page: 2, category: 'complex' },
      { page: 4, category: 'all' },
      { page: 0, category: 'all' },
      { page: 1.5, category: 'all' },
      { page: WORKS_MAX_PAGE + 1, category: 'all' },
      { page: '1', category: 'all' },
      { page: 1, category: 'bathrooms' },
    ]) {
      expect(await loadProjects(input)).toEqual({ items: [], hasMore: false })
    }
    expect(queries.getWorksPage).not.toHaveBeenCalled()
  })
})

describe('WorkCard', () => {
  const work = toWorkPreview(project(1, 'complex', 'video'))

  it('home: H3, 9:14 with the larger radius and the 32 icon', () => {
    const { container } = render(<WorkCard work={work} variant="home" />)
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe('Работа 1')
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/works/rabota-1')
    expect(link.className).toContain('aspect-9/14')
    expect(link.className).toContain('rounded-thumb-lg')
    expect(container.querySelector('.size-8')).not.toBeNull()
    expect(screen.getByText('Видео').className).toBe('sr-only')
  })

  it('feed: H2, 9:16 with radius 14, the accent category and the 26 icon', () => {
    const feed = toFeedWork(project(2, 'kitchens'))
    const { container } = render(<WorkCard work={feed} variant="feed" />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Работа 2')
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/works/rabota-2')
    expect(link.className).toContain('aspect-9/16')
    expect(link.className).toMatch(/rounded-thumb(\s|$)/)
    expect(screen.getByText('Кухни').className).toContain('text-work-category')
    expect(container.querySelector('.size-6\\.5')).not.toBeNull()
    expect(screen.getByText('Фото').className).toBe('sr-only')
  })
})

describe('WorksFeed', () => {
  const chips = worksChips(COUNTS)
  // The end of the grid far below the viewport unless a test moves it
  let endTop = 5000
  const deferred = () => {
    let resolve!: (page: WorksFeedPage) => void
    const promise = new Promise<WorksFeedPage>((r) => {
      resolve = r
    })
    return { promise, resolve }
  }

  beforeEach(() => {
    url.set('')
    endTop = 5000
    action.load.mockReset()
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top: endTop, bottom: endTop, left: 0, right: 0, width: 0, height: 0 }) as DOMRect,
    )
    vi.spyOn(window.history, 'replaceState').mockImplementation((_s, _t, next) => {
      url.set(new URL(String(next), 'http://localhost').search)
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mount = (filter: WorksFeedFilter = ALL_WORKS, items = works(1, 12), hasMore = true) =>
    render(
      <WorksView
        initial={{ filter, items, hasMore }}
        counts={COUNTS}
        listTitle="Работы"
        origin="https://mgs.test"
        cta={{ label: null, messengers: [] }}
      >
        <WorksFeed chips={chips} counts={COUNTS} />
      </WorksView>,
    )

  const list = () => screen.getAllByRole('list').at(-1)!
  const cardIds = () =>
    within(list())
      .queryAllByRole('link')
      .map((a) => a.getAttribute('href'))
  const skeletonCount = () => list().querySelectorAll('[data-skeleton]').length

  it('renders the server page without a request; priority only on the first row', () => {
    mount()
    expect(cardIds()).toHaveLength(12)
    expect(list().querySelectorAll('img[fetchpriority="high"]')).toHaveLength(3)
    expect(screen.getByText('30 работ')).toBeTruthy()
    expect(action.load).not.toHaveBeenCalled()
    expect(screen.queryByText('Вы посмотрели все работы')).toBeNull()
  })

  it('the next page near the end: a row of skeletons, aria-busy, then the cards without duplicates', async () => {
    mount()
    const next = deferred()
    action.load.mockReturnValueOnce(next.promise)
    act(() => intersect(true))
    expect(action.load).toHaveBeenCalledWith({ page: 2, category: 'all' })
    expect(skeletonCount()).toBe(6)
    expect(list().getAttribute('aria-busy')).toBe('true')
    // A second report while loading does not start another request
    act(() => intersect(true))
    expect(action.load).toHaveBeenCalledTimes(1)
    await act(async () => next.resolve({ items: works(12, 12), hasMore: false }))
    expect(cardIds()).toHaveLength(23)
    expect(skeletonCount()).toBe(0)
    expect(list().getAttribute('aria-busy')).toBeNull()
    const end = screen.getByText('Вы посмотрели все работы')
    expect(end.getAttribute('role')).toBeNull()
  })

  it('keeps loading while the end is still in the preload zone (tall screen)', async () => {
    action.load
      .mockResolvedValueOnce({ items: works(13, 12), hasMore: true })
      .mockResolvedValueOnce({ items: works(25, 6), hasMore: false })
    endTop = 100
    await act(async () => {
      mount()
    })
    await act(async () => {})
    expect(action.load.mock.calls.map(([input]) => input)).toEqual([
      { page: 2, category: 'all' },
      { page: 3, category: 'all' },
    ])
    expect(cardIds()).toHaveLength(30)
  })

  it('another filter: a page of skeletons in place of the list, then its first page', async () => {
    mount()
    const next = deferred()
    action.load.mockReturnValueOnce(next.promise)
    await userEvent.click(screen.getByRole('button', { name: 'Кухни' }))
    expect(url.search).toBe('?category=kitchens')
    expect(action.load).toHaveBeenCalledWith({ page: 1, category: 'kitchens' })
    expect(cardIds()).toHaveLength(0)
    expect(skeletonCount()).toBe(12)
    expect(screen.getByText('3 работы · кухни')).toBeTruthy()
    await act(async () => next.resolve({ items: works(40, 3, 'kitchens'), hasMore: false }))
    expect(cardIds()).toEqual(['/works/rabota-40', '/works/rabota-41', '/works/rabota-42'])
    // After a filter change no card is preloaded
    expect(list().querySelectorAll('img[fetchpriority="high"]')).toHaveLength(0)
  })

  it('two quick changes: the answer of the stale filter is dropped', async () => {
    mount()
    const kitchens = deferred()
    const bedrooms = deferred()
    action.load.mockReturnValueOnce(kitchens.promise).mockReturnValueOnce(bedrooms.promise)
    await userEvent.click(screen.getByRole('button', { name: 'Кухни' }))
    await userEvent.click(screen.getByRole('button', { name: 'Спальни' }))
    await act(async () => bedrooms.resolve({ items: works(50, 3, 'bedrooms'), hasMore: false }))
    await act(async () => kitchens.resolve({ items: works(40, 3, 'kitchens'), hasMore: false }))
    expect(cardIds()).toEqual(['/works/rabota-50', '/works/rabota-51', '/works/rabota-52'])
    expect(screen.getByText('3 работы · спальни')).toBeTruthy()
  })

  it('a direct visit to a filter: no request on mount', () => {
    url.set('?category=kitchens')
    mount('kitchens', works(40, 3, 'kitchens'), false)
    expect(action.load).not.toHaveBeenCalled()
    expect(screen.getByText('Вы посмотрели все работы')).toBeTruthy()
  })

  it('a failed load does not retry by itself', async () => {
    endTop = 100
    action.load.mockRejectedValue(new Error('offline'))
    await act(async () => {
      mount()
    })
    await act(async () => {})
    expect(action.load).toHaveBeenCalledTimes(1)
    // The observer's first report after the failure is ignored, a later one retries
    act(() => intersect(true))
    expect(action.load).toHaveBeenCalledTimes(1)
    act(() => intersect(true))
    expect(action.load).toHaveBeenCalledTimes(2)
  })
})
