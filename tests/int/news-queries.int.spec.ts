import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cleanup, createImage, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope for connection(); the cache records its options and
// every call that would write an entry.
const caches = vi.hoisted(() => ({
  options: [] as { keys: string[]; tags: string[] }[],
  calls: [] as { keys: string[]; args: unknown[] }[],
}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(
    fn: T,
    keys: string[],
    options: { tags: string[] },
  ) => {
    caches.options.push({ keys, tags: options.tags })
    return (...args: Parameters<T>) => {
      caches.calls.push({ keys, args })
      return fn(...args)
    }
  },
  // Writes in these tests go through the cache hooks (lib/revalidate.ts)
  revalidateTag: () => {},
}))

const { getNewsCounts, getNewsList, getNewsPage } = await import('@/lib/queries')
const { loadNews } = await import('@/app/(frontend)/news/actions')

// Dates far in the future: the test rows come first among existing data.
const day = (n: number) => `2099-02-${String(n).padStart(2, '0')}T12:00:00.000Z`
const feedCalls = () => caches.calls.filter((c) => c.keys[0] === 'collection:news:feed')

describe('news list queries', () => {
  let payload: Payload
  let before: Awaited<ReturnType<typeof getNewsCounts>>
  // Test news titles in the expected list order
  const expected: string[] = []
  const expectedNew: string[] = []

  beforeAll(async () => {
    payload = await getTestPayload()
    before = await getNewsCounts()
    const image = await createImage(payload)
    const news = (n: number, type: 'news' | 'new', date: string, status = 'published') =>
      payload.create({
        collection: 'news',
        data: {
          title: `${PREFIX} ${n}`,
          slug: `${PREFIX}-${n}`,
          type,
          date,
          lead: `Лид ${n}`,
          cover: image.id,
          ...(status === 'published' ? { _status: 'published' as const } : {}),
        },
        ...(status === 'draft' ? { draft: true } : {}),
        depth: 0,
      })
    // 9 published: dates 20 down to 12; 1 and 2 share a date (the later created first)
    const types = ['news', 'new', 'news', 'new', 'news', 'news', 'new', 'news', 'new'] as const
    for (let n = 8; n >= 0; n--) {
      if (n === 1) continue
      await news(n, types[n]!, day(20 - n))
    }
    await news(1, types[1]!, day(18))
    for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      expected.push(`${PREFIX} ${n}`)
      if (types[n] === 'new') expectedNew.push(`${PREFIX} ${n}`)
    }
    // A draft newer than all: never listed, never counted
    await news(99, 'news', day(28), 'draft')
    // Published, then a draft edit: the list keeps the published title
    const edited = await news(50, 'new', day(25))
    await payload.update({
      collection: 'news',
      id: edited.id,
      data: { title: `${PREFIX} 50 draft` },
      draft: true,
      depth: 0,
    })
    expected.unshift(`${PREFIX} 50`)
    expectedNew.unshift(`${PREFIX} 50`)
  })

  afterAll(async () => {
    await cleanup(payload)
  })

  it('caches by tab and page under the news tag', () => {
    for (const key of ['collection:news:feed', 'collection:news:counts', 'collection:news:list']) {
      expect(caches.options.find((o) => o.keys[0] === key)?.tags).toEqual(['collection:news'])
    }
  })

  it('counts published news per tab; drafts are not counted', async () => {
    const counts = await getNewsCounts()
    expect(counts.all - before.all).toBe(expected.length)
    expect(counts.new - before.new).toBe(expectedNew.length)
    expect(counts.news - before.news).toBe(expected.length - expectedNew.length)
  })

  it('pages of 6, newest first, the id breaking ties; no duplicates across pages', async () => {
    const first = await getNewsPage('all', 1)
    const second = await getNewsPage('all', 2)
    expect(first.items).toHaveLength(6)
    expect(first.hasMore).toBe(true)
    const titles = [...first.items, ...second.items].map((item) => item.title)
    expect(titles.slice(0, expected.length)).toEqual(expected)
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(
      first.items.length + second.items.length,
    )
    expect(titles).not.toContain(`${PREFIX} 99`)
    expect(titles).not.toContain(`${PREFIX} 50 draft`)
  })

  it('a card: the article link, the tag, the cover with urls; no body', async () => {
    const [card] = (await getNewsPage('new', 1)).items
    expect(card).toMatchObject({
      title: `${PREFIX} 50`,
      href: `/news/${PREFIX}-50`,
      type: 'new',
      tag: 'Новинка',
      lead: 'Лид 50',
      date: '25.02.2099',
    })
    expect(card).not.toHaveProperty('body')
    expect(card!.cover?.url).toBeTruthy()
    expect(card!.cover?.sizes?.card?.url).toBeTruthy()
    expect(card!.cover?.alt).toBeTruthy()
  })

  it('a tab: only its type', async () => {
    const page = await getNewsPage('new', 1)
    expect(page.items.every((item) => item.type === 'new')).toBe(true)
    expect(page.items.slice(0, expectedNew.length).map((i) => i.title)).toEqual(
      expectedNew.slice(0, 6),
    )
  })

  it('the ItemList: every published news item in list order', async () => {
    const list = await getNewsList()
    expect(list.slice(0, expected.length).map((item) => item.title)).toEqual(expected)
    expect(list[0]).toEqual({ slug: `${PREFIX}-50`, title: `${PREFIX} 50` })
  })

  it('loadNews: an unknown type is «все»; an invalid page answers empty before the cache', async () => {
    expect((await loadNews({ page: 1, type: 'nope' })).items[0]?.title).toBe(`${PREFIX} 50`)
    const counts = await getNewsCounts()
    const calls = feedCalls().length
    const last = Math.ceil(counts.all / 6)
    for (const page of [0, 1.5, '1', last + 1, 1001]) {
      expect(await loadNews({ page, type: 'all' })).toEqual({ items: [], hasMore: false })
    }
    expect(feedCalls()).toHaveLength(calls)
    const end = await loadNews({ page: last, type: 'all' })
    expect(end.items.length).toBeGreaterThan(0)
    expect(end.hasMore).toBe(false)
  })
})
