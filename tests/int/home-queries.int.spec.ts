import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cleanup, createImage, createVideo, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope for connection(), no incremental cache.
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  // Writes in these tests go through the cache hooks (lib/revalidate.ts)
  revalidateTag: () => {},
}))

const { getHomeWorks, getLatestNews, getNewsBySlug, getSalons } = await import('@/lib/queries')

// Dates far in the future and the lowest order: the test rows come first among existing data.
const day = (n: number) => `2099-01-${String(n).padStart(2, '0')}T12:00:00.000Z`
const FIRST = -1_000_000

describe('home page and news queries', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
    const image = await createImage(payload)
    const video = await createVideo(payload)

    const news = (
      title: string,
      date: string,
      status: 'published' | 'draft',
      coverVideo?: number,
    ) => {
      const data = {
        title: `${PREFIX} ${title}`,
        slug: `${PREFIX}-${title}`,
        type: 'news' as const,
        date,
        cover: image.id,
        coverVideo,
      }
      return status === 'draft'
        ? payload.create({ collection: 'news', data, draft: true, depth: 0 })
        : payload.create({
            collection: 'news',
            data: { ...data, _status: 'published' },
            depth: 0,
          })
    }
    await news('older', day(1), 'published')
    await news('newer', day(2), 'published', video.id)
    await news('draft', day(3), 'draft')
    // Published, then a draft edit with a newer title: visitors keep the published one
    const edited = await news('edited', day(4), 'published')
    await payload.update({
      collection: 'news',
      id: edited.id,
      data: { title: `${PREFIX} edited draft` },
      draft: true,
      depth: 0,
    })

    const project = (title: string, featured: boolean, order: number, withVideo = false) =>
      payload.create({
        collection: 'projects',
        data: {
          title: `${PREFIX} ${title}`,
          slug: `${PREFIX}-${title.replaceAll(' ', '-')}`,
          category: 'hallways',
          featured,
          order,
          slides: [
            ...(withVideo ? [{ type: 'video' as const, file: video.id, poster: image.id }] : []),
            { type: 'photo' as const, file: image.id },
          ],
        },
        depth: 0,
      })
    await project('plain first by order', false, FIRST)
    await project('featured', true, FIRST + 1)
    await project('reel', true, FIRST, true)

    const salon = (name: string, order: number) =>
      payload.create({
        collection: 'salons',
        data: {
          name: `${PREFIX} ${name}`,
          address: 'Москва',
          phone: '8-495-777-35-75',
          hours: '10:00–21:00',
          location: { lat: 55.65, lng: 37.63 },
          poster: image.id,
          order,
        },
        depth: 0,
      })
    await salon('second', FIRST + 1)
    await salon('first', FIRST)
  })

  afterAll(async () => {
    await cleanup(payload)
  })

  it('latest news: published only, newest first, never a draft edit', async () => {
    const titles = (await getLatestNews(3)).map((n) => n.title)
    expect(titles).toEqual([`${PREFIX} edited`, `${PREFIX} newer`, `${PREFIX} older`])
  })

  it('latest news: the cover video is populated, empty without one', async () => {
    const [edited, newer] = await getLatestNews(3)
    expect(newer!.coverVideo).toMatchObject({ mimeType: 'video/mp4' })
    expect(edited!.coverVideo ?? null).toBeNull()
  })

  it('news by slug: published only, never a draft or a draft edit', async () => {
    expect(await getNewsBySlug(`${PREFIX}-older`)).toMatchObject({ title: `${PREFIX} older` })
    expect(await getNewsBySlug(`${PREFIX}-edited`)).toMatchObject({ title: `${PREFIX} edited` })
    expect(await getNewsBySlug(`${PREFIX}-draft`)).toBeNull()
    expect(await getNewsBySlug(`${PREFIX}-nesushchestvuet`)).toBeNull()
  })

  it('home works: «На главной» first, then by order; reels are the video projects', async () => {
    const panels = await getHomeWorks()
    const hallways = panels.find((p) => p.key === 'hallways')!
    expect(hallways.label).toBe('Прихожие')
    expect(hallways.works.slice(0, 3).map((w) => w.title)).toEqual([
      `${PREFIX} reel`,
      `${PREFIX} featured`,
      `${PREFIX} plain first by order`,
    ])

    const reels = panels.find((p) => p.key === 'reels')!
    expect(reels.works[0]).toMatchObject({
      title: `${PREFIX} reel`,
      kind: 'video',
      category: 'Прихожие',
      href: expect.stringMatching(/^\/works\/[a-z0-9-]+$/),
    })
    expect(reels.works.map((w) => w.title)).not.toContain(`${PREFIX} featured`)
    expect(reels.works[0]!.image?.mimeType).toMatch(/^image\//)
  })

  it('salons: by order, only the map and card fields', async () => {
    const salons = await getSalons()
    expect(salons.slice(0, 2).map((s) => s.name)).toEqual([`${PREFIX} first`, `${PREFIX} second`])
    const first = salons[0]!
    expect(first).toMatchObject({ address: 'Москва', location: { lat: 55.65, lng: 37.63 } })
    expect(first).not.toHaveProperty('hours')
    expect(first).not.toHaveProperty('poster')
    expect(first).not.toHaveProperty('reviewVideo')
  })
})
