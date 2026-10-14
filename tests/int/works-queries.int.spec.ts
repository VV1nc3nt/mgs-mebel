import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cleanup, createImage, createVideo, getTestPayload, PREFIX } from './helpers'

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

const { getWorksCounts, getWorksPage } = await import('@/lib/queries')
const { loadProjects } = await import('@/app/(frontend)/works/actions')

// The lowest order: the test rows come first among existing data.
const FIRST = -1_000_000
// 14 wardrobe projects (videos: 2) and 2 more with equal order and time: 12 on the first page of
// «все», 4 on the next
const TOTAL = 14
const VIDEOS = 2
const feedCalls = () => caches.calls.filter((c) => c.keys[0] === 'collection:projects:feed')

describe('works feed queries', () => {
  let payload: Payload
  let before: Awaited<ReturnType<typeof getWorksCounts>>
  // Test project titles in the expected feed order
  const expected: string[] = []

  beforeAll(async () => {
    payload = await getTestPayload()
    before = await getWorksCounts()
    const image = await createImage(payload)
    const video = await createVideo(payload)
    const project = (n: number, order: number, withVideo = false, createdAt?: string) =>
      payload.create({
        collection: 'projects',
        data: {
          title: `${PREFIX} ${n}`,
          slug: `${PREFIX}-${n}`,
          category: 'wardrobes',
          // «На главной» does not move a project in the feed
          featured: n === TOTAL - 1,
          order,
          slides: [
            ...(withVideo ? [{ type: 'video' as const, file: video.id, poster: image.id }] : []),
            { type: 'photo' as const, file: image.id },
          ],
          ...(createdAt ? { createdAt } : {}),
        },
        depth: 0,
      })
    // Created in reverse, so neither the id nor the creation time gives the order by itself
    for (let n = TOTAL - 1; n >= 0; n--) {
      if (n === 4 || n === 5) continue
      await project(n, FIRST + n, n < VIDEOS)
    }
    // Equal order: the newer one first; equal order and time: the larger id first
    await project(5, FIRST + 4, false, '2026-01-01T00:00:00.000Z')
    await project(4, FIRST + 4, false, '2026-02-01T00:00:00.000Z')
    const tieA = await project(100, FIRST + 3, false, '2026-03-01T00:00:00.000Z')
    const tieB = await project(101, FIRST + 3, false, '2026-03-01T00:00:00.000Z')
    // Order 3: the project created now, then the two of March (larger id first)
    for (let n = 0; n < TOTAL; n++) {
      expected.push(`${PREFIX} ${n}`)
      if (n === 3) expected.push(`${PREFIX} 101`, `${PREFIX} 100`)
    }
    expect(tieB.id).toBeGreaterThan(tieA.id)
  })

  afterAll(async () => {
    await cleanup(payload)
  })

  it('are cached under the projects collection tag', () => {
    expect(caches.options).toContainEqual({
      keys: ['collection:projects:feed'],
      tags: ['collection:projects'],
    })
    expect(caches.options).toContainEqual({
      keys: ['collection:projects:counts'],
      tags: ['collection:projects'],
    })
  })

  it('count works per filter: «все», reels and categories', async () => {
    const after = await getWorksCounts()
    const added = TOTAL + 2
    expect(after.all - before.all).toBe(added)
    expect(after.wardrobes - before.wardrobes).toBe(added)
    expect(after.reels - before.reels).toBe(VIDEOS)
    expect(after.kitchens).toBe(before.kitchens)
  })

  it('pages: order, then the newest, then the larger id; stable, without duplicates', async () => {
    const first = await getWorksPage('all', 1)
    const second = await getWorksPage('all', 2)
    expect(first.items).toHaveLength(12)
    expect(first.hasMore).toBe(true)
    const ours = [...first.items, ...second.items]
      .map((w) => w.title)
      .filter((t) => t.startsWith(PREFIX))
    expect(ours).toEqual(expected)
    const ids = [...first.items, ...second.items].map((w) => w.id)
    expect(new Set(ids).size).toBe(ids.length)
    // The same page twice: the same cards
    expect((await getWorksPage('all', 1)).items.map((w) => w.id)).toEqual(
      first.items.map((w) => w.id),
    )
  })

  it('reels are the video projects; the card has its own category and the poster', async () => {
    const { items } = await getWorksPage('reels', 1)
    const ours = items.filter((w) => w.title.startsWith(PREFIX))
    expect(ours.map((w) => w.title)).toEqual([`${PREFIX} 0`, `${PREFIX} 1`])
    expect(ours[0]).toMatchObject({ kind: 'video', category: 'Гардеробные' })
    expect(ours[0]!.href).toBe(`/works/${PREFIX}-0`)
  })

  it('card media: url (needs filename), alt and size, the selected fields only', async () => {
    const { items } = await getWorksPage('wardrobes', 1)
    const card = items.find((w) => w.title === `${PREFIX} 0`)!
    expect(Object.keys(card).sort()).toEqual(
      ['category', 'href', 'id', 'image', 'kind', 'slug', 'title'].sort(),
    )
    expect(card.image?.url).toMatch(/^\/api\/media\/file\/.+\.png$/)
    expect(card.image?.alt).toBe('test')
    expect(card.image?.width).toBe(4)
    expect(card.image).not.toHaveProperty('updatedAt')
  })

  it('loadProjects: an unknown category is «все»; a page past the end never reaches the cache', async () => {
    const counts = await getWorksCounts()
    const lastPage = Math.ceil(counts.all / 12)
    const unknown = await loadProjects({ page: 1, category: 'unknown' })
    expect(unknown.items.map((w) => w.id)).toEqual(
      (await getWorksPage('all', 1)).items.map((w) => w.id),
    )
    expect((await loadProjects({ page: lastPage, category: 'all' })).hasMore).toBe(false)

    const calls = feedCalls().length
    for (const input of [
      { page: lastPage + 1, category: 'all' },
      { page: 1000, category: 'kitchens' },
      { page: 1001, category: 'all' },
      { page: 0, category: 'all' },
      { page: 1.5, category: 'all' },
    ]) {
      expect(await loadProjects(input)).toEqual({ items: [], hasMore: false })
    }
    expect(feedCalls()).toHaveLength(calls)
  })
})
