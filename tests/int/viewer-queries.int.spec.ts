import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cleanup, createImage, createVideo, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope for connection(); the cache records its options and
// every call that would write an entry.
const caches = vi.hoisted(() => ({
  options: [] as { keys: string[]; tags: string[] }[],
  calls: [] as { keys: string[] }[],
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
      caches.calls.push({ keys })
      return fn(...args)
    }
  },
  revalidateTag: () => {},
}))

const { getProjectBySlug, getProjectPosition } = await import('@/lib/queries')
const { loadProject } = await import('@/app/(frontend)/works/[slug]/actions')

const slugCalls = (slug: string) =>
  caches.calls.filter((c) => c.keys[0] === 'collection:projects:slug' && c.keys[1] === slug)

describe('project viewer queries', () => {
  let payload: Payload
  const slugs: string[] = []

  beforeAll(async () => {
    payload = await getTestPayload()
    const image = await createImage(payload)
    const video = await createVideo(payload)
    const project = async (
      n: number,
      order: number | null,
      createdAt?: string,
      withVideo = false,
    ) => {
      const slug = `${PREFIX}-viewer-${n}`
      slugs.push(slug)
      await payload.create({
        collection: 'projects',
        data: {
          title: `${PREFIX} viewer ${n}`,
          slug,
          category: 'kitchens',
          place: 'ЖК «Тест»',
          area: 42,
          duration: '4 недели',
          description: 'Описание проекта',
          order,
          slides: [
            ...(withVideo ? [{ type: 'video' as const, file: video.id, poster: image.id }] : []),
            { type: 'photo' as const, file: image.id },
          ],
          ...(createdAt ? { createdAt } : {}),
        },
        depth: 0,
      })
    }
    // Ties of order, of order and time, and an empty order (sorted last)
    await project(0, -2_000_000, undefined, true)
    await project(1, -1_999_999, '2026-01-01T00:00:00.000Z')
    await project(2, -1_999_999, '2026-02-01T00:00:00.000Z')
    await project(3, -1_999_998, '2026-03-01T00:00:00.000Z')
    await project(4, -1_999_998, '2026-03-01T00:00:00.000Z')
    await project(5, null, '2026-03-01T00:00:00.000Z')
    await project(6, null, '2026-04-01T00:00:00.000Z')
    await project(7, null, '2026-04-01T00:00:00.000Z')
  })

  afterAll(async () => {
    await cleanup(payload)
  })

  it('the position is the index in the feed order (order, -createdAt, -id), ties included', async () => {
    const { docs } = await payload.find({
      collection: 'projects',
      sort: ['order', '-createdAt', '-id'],
      pagination: false,
      depth: 0,
      select: { slug: true },
    })
    const order = docs.map((doc) => doc.slug)
    for (const slug of slugs) {
      const data = await getProjectBySlug(slug)
      expect(data, slug).not.toBeNull()
      expect(await getProjectPosition(data!.sort), slug).toBe(order.indexOf(slug))
    }
  })

  it('a project: view-model with frames whose files have URLs; one cache entry per slug', async () => {
    const data = await getProjectBySlug(slugs[0]!)
    expect(data!.project).toMatchObject({
      slug: slugs[0],
      href: `/works/${slugs[0]}`,
      title: `${PREFIX} viewer 0`,
      category: 'Кухни',
      place: 'ЖК «Тест»',
      facts: ['42 м²', '4 недели', 'видео + фото'],
      description: 'Описание проекта',
    })
    const [first, second] = data!.project.frames
    expect(first).toMatchObject({ kind: 'video', video: { type: 'video/mp4' } })
    expect(first!.image?.url).toBeTruthy()
    expect(first!.video?.src).toBeTruthy()
    expect(second).toMatchObject({ kind: 'photo', video: null })
    expect(second!.image?.url).toBeTruthy()
    expect(second!.image?.sizes?.hero?.url ?? second!.image?.url).toBeTruthy()
    expect(caches.options).toContainEqual({
      keys: ['collection:projects:slug', slugs[0]],
      tags: ['collection:projects'],
    })
    expect(caches.options).toContainEqual({
      keys: ['collection:projects:slugs'],
      tags: ['collection:projects'],
    })
  })

  it('an unknown or malformed slug: null before the per-slug cache', async () => {
    for (const slug of [`${PREFIX}-viewer-missing`, 'Bad Slug', '../x', '']) {
      expect(await getProjectBySlug(slug)).toBeNull()
      expect(slugCalls(slug)).toEqual([])
    }
  })

  it('loadProject: a project for its slug; null for anything else', async () => {
    expect((await loadProject(slugs[1]))?.slug).toBe(slugs[1])
    for (const input of [`${PREFIX}-viewer-missing`, 'Bad Slug', 42, null, { slug: slugs[1] }]) {
      expect(await loadProject(input)).toBeNull()
    }
  })
})
