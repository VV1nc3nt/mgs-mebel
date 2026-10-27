import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSyncExternalStore } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NewsCard } from '@/components/news/NewsCard'
import { NewsFeed } from '@/components/news/NewsFeed'
import {
  ALL_NEWS,
  NEWS_FEED_FILTERS,
  NEWS_PAGE_SIZE,
  appendNews,
  newsPage,
  newsTabs,
  toNewsCard,
  type NewsCardData,
  type NewsCounts,
  type NewsRow,
} from '@/lib/news'
import { newsTypeLabel } from '@/lib/newsTypes'
import { parseFilter } from '@/lib/segmentFilter'
import { photo } from './fixtures'

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
const queries = vi.hoisted(() => ({ getNewsCounts: vi.fn(), getNewsPage: vi.fn() }))
vi.mock('@/lib/queries', () => queries)
const action = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/app/(frontend)/news/actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/(frontend)/news/actions')>()
  return { ...actual, loadNews: (input: unknown) => action.load(input) }
})

const row = (id: number, type: NewsRow['type'] = 'news'): NewsRow => ({
  id,
  title: `Новость ${id}`,
  slug: `novost-${id}`,
  type,
  date: '2026-02-19T12:00:00.000Z',
  lead: `Лид новости ${id}`,
  cover: photo,
})
const cardsOf = (from: number, n: number, type: NewsRow['type'] = 'news') =>
  Array.from({ length: n }, (_, i) => toNewsCard(row(from + i, type)))

const COUNTS: NewsCounts = { all: 13, news: 7, new: 6 }

describe('news data', () => {
  it('a card has the article link, the date and the tag of its type; no body', () => {
    const card = toNewsCard({ ...row(1, 'new'), lead: '  Лид  ' })
    expect(card).toEqual({
      id: 1,
      slug: 'novost-1',
      href: '/news/novost-1',
      title: 'Новость 1',
      lead: 'Лид',
      date: '19.02.2026',
      type: 'new',
      tag: 'Новинка',
      cover: photo,
    })
    expect(toNewsCard({ ...row(2), cover: 5, lead: null }).cover).toBeNull()
    expect(toNewsCard({ ...row(2), lead: null }).lead).toBe('')
    expect(newsTypeLabel('news')).toBe('Новость')
  })

  it('the type in the URL: an unknown or empty one is «все»', () => {
    expect(parseFilter('new', NEWS_FEED_FILTERS, ALL_NEWS)).toBe('new')
    expect(parseFilter('news', NEWS_FEED_FILTERS, ALL_NEWS)).toBe('news')
    for (const raw of ['', null, 'novinki', 'NEW']) {
      expect(parseFilter(raw, NEWS_FEED_FILTERS, ALL_NEWS)).toBe(ALL_NEWS)
    }
  })

  it('tabs: «все» and the types that have news; none without news', () => {
    expect(newsTabs(COUNTS).map((t) => t.label)).toEqual(['все', 'новости', 'новинки'])
    expect(newsTabs({ all: 3, news: 3, new: 0 }).map((t) => t.value)).toEqual(['all', 'news'])
    expect(newsTabs({ all: 0, news: 0, new: 0 })).toEqual([])
  })

  it('a page is an integer within the tab, from 1 to 1000', () => {
    expect(NEWS_PAGE_SIZE).toBe(6)
    expect(newsPage(1, 13)).toBe(1)
    expect(newsPage(3, 13)).toBe(3)
    expect(newsPage(4, 13)).toBeNull()
    expect(newsPage(2, 6)).toBeNull()
    expect(newsPage(1, 0)).toBeNull()
    for (const page of [0, -1, 1.5, '2', null, undefined, NaN, 1001]) {
      expect(newsPage(page, 100_000)).toBeNull()
    }
    expect(newsPage(1000, 100_000)).toBe(1000)
  })

  it('appending skips the cards already in the list', () => {
    const list = appendNews(cardsOf(1, 3), [...cardsOf(3, 3)])
    expect(list.map((c) => c.id)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('loadNews', () => {
  beforeEach(() => {
    queries.getNewsCounts.mockReset().mockResolvedValue(COUNTS)
    queries.getNewsPage.mockReset().mockResolvedValue({ items: [], hasMore: true })
  })

  const actual = () =>
    vi.importActual<typeof import('@/app/(frontend)/news/actions')>('@/app/(frontend)/news/actions')

  it('reads the page of a known type; an unknown one is «все»', async () => {
    const { loadNews } = await actual()
    await loadNews({ page: 2, type: 'news' })
    expect(queries.getNewsPage).toHaveBeenLastCalledWith('news', 2)
    await loadNews({ page: 3, type: 'all' })
    expect(queries.getNewsPage).toHaveBeenLastCalledWith('all', 3)
    await loadNews({ page: 1, type: 'unknown' })
    expect(queries.getNewsPage).toHaveBeenLastCalledWith('all', 1)
    await loadNews({ page: 1, type: { toString: () => 'new' } })
    expect(queries.getNewsPage).toHaveBeenLastCalledWith('all', 1)
  })

  it('answers empty before the cache for a page past the end or an invalid one', async () => {
    const { loadNews } = await actual()
    for (const input of [
      { page: 2, type: 'new' },
      { page: 3, type: 'news' },
      { page: 4, type: 'all' },
      { page: 0, type: 'all' },
      { page: 1.5, type: 'all' },
      { page: '1', type: 'all' },
      { page: 1001, type: 'all' },
      null,
    ]) {
      expect(await loadNews(input as never)).toEqual({ items: [], hasMore: false })
    }
    expect(queries.getNewsPage).not.toHaveBeenCalled()
  })
})

const item = (over: Partial<NewsCardData> = {}): NewsCardData => ({
  ...toNewsCard(row(1)),
  ...over,
})

describe('NewsCard', () => {
  it('links the whole card to the article, named by its H2 title', () => {
    render(<NewsCard item={item()} />)
    const link = screen.getByRole('link', { name: 'Новость 1' })
    expect(link.getAttribute('href')).toBe('/news/novost-1')
    expect(within(link).getByRole('heading', { level: 2 }).textContent).toContain('Новость 1')
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(link.textContent).toContain('19.02.2026')
    expect(link.textContent).toContain('Лид новости 1')
    expect(link.textContent).toContain('Читать')
    expect(link.className).toContain('h-news-tile')
  })

  it('«Новость» on glass, «Новинка» on the accent', () => {
    const { rerender } = render(<NewsCard item={item()} />)
    expect(screen.getByText('Новость').className).toContain('glass')
    rerender(<NewsCard item={item({ type: 'new', tag: 'Новинка' })} />)
    expect(screen.getByText('Новинка').className).toContain('bg-accent')
  })

  it('no date, no lead — no empty chip or paragraph', () => {
    render(<NewsCard item={item({ date: '', lead: '' })} />)
    const link = screen.getByRole('link')
    expect(link.querySelectorAll('p')).toHaveLength(0)
    expect(link.textContent).not.toContain('19.02.2026')
  })
})

describe('NewsFeed', () => {
  beforeEach(() => {
    url.set('')
    action.load.mockReset()
    window.history.replaceState(null, '', '/news')
    vi.spyOn(window.history, 'replaceState').mockImplementation((_s, _t, next) => {
      url.set(new URL(String(next), 'http://localhost').search)
    })
  })

  const feed = (counts = COUNTS) => (
    <NewsFeed
      tabs={newsTabs(counts)}
      counts={counts}
      initial={{ filter: 'all', items: cardsOf(1, 6), hasMore: true }}
    />
  )
  const cards = () => screen.getAllByRole('heading', { level: 2 })

  it('toggle buttons with counters in a named group; the server page without a request', () => {
    render(feed({ all: 6, news: 6, new: 0 }))
    const group = screen.getByRole('group', { name: 'Тип новостей' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['все 6', 'новости 6'])
    expect(within(group).getByRole('button', { name: 'все 6' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(cards()).toHaveLength(6)
    expect(action.load).not.toHaveBeenCalled()
  })

  it('«Показать ещё» loads the next page; a second click while loading does nothing', async () => {
    let resolve: (value: unknown) => void = () => {}
    action.load.mockImplementation(() => new Promise((r) => (resolve = r)))
    render(feed())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Показать ещё' }))
    await user.click(screen.getByRole('button', { name: 'Показать ещё' }))
    expect(action.load).toHaveBeenCalledTimes(1)
    expect(action.load).toHaveBeenLastCalledWith({ page: 2, type: 'all' })
    expect(screen.getByRole('list').getAttribute('aria-busy')).toBe('true')
    await act(async () => resolve({ items: cardsOf(7, 6), hasMore: true }))
    expect(cards()).toHaveLength(12)
    // The focus moves to the first new card
    expect(document.activeElement?.getAttribute('href')).toBe('/news/novost-7')
  })

  it('a failed load keeps the button and does not throw', async () => {
    action.load.mockRejectedValueOnce(new Error('network'))
    render(feed())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Показать ещё' }))
    expect(cards()).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Показать ещё' })).toBeTruthy()
    expect(screen.getByRole('list').hasAttribute('aria-busy')).toBe(false)
    action.load.mockResolvedValueOnce({ items: cardsOf(7, 1), hasMore: false })
    await user.click(screen.getByRole('button', { name: 'Показать ещё' }))
    expect(cards()).toHaveLength(7)
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).toBeNull()
  })

  it('back to a tab: no request, with every page loaded on it', async () => {
    action.load.mockImplementation(async ({ page, type }: { page: number; type: string }) =>
      type === 'new'
        ? { items: cardsOf(20, 6, 'new'), hasMore: false }
        : { items: cardsOf(1 + (page - 1) * 6, 6), hasMore: page < 3 },
    )
    render(feed())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Показать ещё' }))
    expect(cards()).toHaveLength(12)
    await user.click(screen.getByRole('button', { name: 'новинки 6' }))
    await waitFor(() => expect(cards()[0].textContent).toBe('Новость 20'))
    await user.click(screen.getByRole('button', { name: 'все 13' }))
    await waitFor(() => expect(cards()).toHaveLength(12))
    expect(url.search).toBe('')
    expect(action.load).toHaveBeenCalledTimes(2)
    await user.click(screen.getByRole('button', { name: 'новинки 6' }))
    await waitFor(() => expect(cards()[0].textContent).toBe('Новость 20'))
    expect(action.load).toHaveBeenCalledTimes(2)
    // The button goes on from the loaded page
    await user.click(screen.getByRole('button', { name: 'все 13' }))
    await waitFor(() => expect(cards()).toHaveLength(12))
    await user.click(screen.getByRole('button', { name: 'Показать ещё' }))
    expect(action.load).toHaveBeenLastCalledWith({ page: 3, type: 'all' })
  })

  it('a failed tab change keeps the tab, the URL and the list', async () => {
    action.load.mockRejectedValueOnce(new Error('network'))
    const { container } = render(feed())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'новинки 6' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'все 13' }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    )
    expect(url.search).toBe('')
    expect(cards()).toHaveLength(6)
    expect(container.querySelectorAll('[data-skeleton]')).toHaveLength(0)
    // A click on the tab tries again
    action.load.mockResolvedValueOnce({ items: cardsOf(20, 6, 'new'), hasMore: false })
    await user.click(screen.getByRole('button', { name: 'новинки 6' }))
    await waitFor(() => expect(cards()[0].textContent).toBe('Новость 20'))
  })

  it('no skeletons on a tab change; «Показать ещё» adds cards without a wave', async () => {
    const rect = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockReturnValue({ top: 0, bottom: 100 } as DOMRect)
    let resolve: (value: unknown) => void = () => {}
    action.load.mockImplementation(() => new Promise((r) => (resolve = r)))
    const { container } = render(feed())
    const user = userEvent.setup()
    // The server list: the first card is the LCP candidate
    expect(container.querySelector('img')?.getAttribute('loading')).not.toBe('lazy')
    await user.click(screen.getByRole('button', { name: 'Показать ещё' }))
    await act(async () => resolve({ items: cardsOf(7, 6), hasMore: true }))
    expect(cards()).toHaveLength(12)
    expect(container.querySelectorAll('[data-wave]')).toHaveLength(0)
    expect(container.querySelector('img')?.getAttribute('loading')).not.toBe('lazy')

    await user.click(screen.getByRole('button', { name: 'новинки 6' }))
    expect(container.querySelectorAll('[data-skeleton]')).toHaveLength(0)
    // The old cards stay until the new ones come
    expect(cards()).toHaveLength(12)
    await act(async () => resolve({ items: cardsOf(20, 6, 'new'), hasMore: false }))
    await waitFor(() => expect(cards()[0].textContent).toBe('Новость 20'))
    // A later list: a wave, no priority image
    expect(container.querySelectorAll('li[data-wave]').length).toBeGreaterThan(0)
    expect(container.querySelector('img')?.getAttribute('loading')).toBe('lazy')
    rect.mockRestore()
  })

  it('another tab replaces the URL and loads its first page', async () => {
    action.load.mockResolvedValue({ items: cardsOf(20, 6, 'new'), hasMore: false })
    render(feed())
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'новинки 6' }))
    expect(url.search).toBe('?type=new')
    expect(action.load).toHaveBeenLastCalledWith({ page: 1, type: 'new' })
    expect(screen.getByRole('button', { name: 'новинки 6' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(cards().map((c) => c.textContent)).toEqual(cardsOf(20, 6).map((c) => c.title))
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).toBeNull()
  })
})
