import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cleanup, createImage, createVideo, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope for connection(), no incremental cache.
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }) }))
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

    // «Наши работы»: a complex project with items of a rare type (kids), one of them featured
    // and one with a video. Test rows go to the end of the editor's order.
    const reelVideo = await createVideo(payload, undefined, image.id)
    const project = await payload.create({
      collection: 'projects',
      data: { title: `${PREFIX} квартира`, slug: `${PREFIX}-kvartira`, complex: true },
      depth: 0,
    })
    const kidsItem = (title: string, featured: boolean, videos: number[] = []) =>
      payload.create({
        collection: 'items',
        data: {
          type: 'kids',
          title: `${PREFIX} ${title}`,
          project: project.id,
          photos: [image.id],
          videos,
          featured,
        },
        depth: 0,
      })
    await kidsItem('plain first by order', false)
    await kidsItem('featured', true)
    await kidsItem('reel', true, [reelVideo.id])

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

  it('home works: «На главной» first, then by order; reels are the videos', async () => {
    const panels = await getHomeWorks()
    const kids = panels.find((p) => p.key === 'kids')!
    expect(kids.label).toBe('Детские')
    const ours = kids.works.filter((w) => w.title.startsWith(PREFIX)).map((w) => w.title)
    expect(ours).toEqual([`${PREFIX} featured`, `${PREFIX} reel`, `${PREFIX} plain first by order`])

    const reels = panels.find((p) => p.key === 'reels')!
    const reel = reels.works.find((w) => w.title === `${PREFIX} reel`)
    expect(reel).toMatchObject({
      kind: 'video',
      category: 'Детская',
      href: '/works?category=reels',
    })
    expect(reel!.image?.mimeType).toMatch(/^image\//)
    expect(reels.works.map((w) => w.title)).not.toContain(`${PREFIX} featured`)
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
