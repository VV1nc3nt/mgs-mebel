import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { cleanup, createImage, getTestPayload, pdfFile, PREFIX } from './helpers'

// Outside a Next request: no request scope for connection(); the cache only records its options.
const caches = vi.hoisted(() => [] as { keys: string[]; tags: string[] }[])
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(
    fn: T,
    keys: string[],
    options: { tags: string[] },
  ) => {
    caches.push({ keys, tags: options.tags })
    return fn
  },
  // Writes in these tests go through the cache hooks (lib/revalidate.ts)
  revalidateTag: () => {},
}))

const { getCatalogs } = await import('@/lib/queries')

// The lowest order: the test rows come first among existing data.
const FIRST = -1_000_000

describe('getCatalogs', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
    const cover = await createImage(payload)
    const render = await createImage(payload)
    const pdf = await payload.create({ collection: 'media', data: {}, file: pdfFile() })
    const catalog = (title: string, order: number, withRender: boolean) =>
      payload.create({
        collection: 'catalogs',
        data: {
          title: `${PREFIX} ${title}`,
          category: 'facades',
          cover: cover.id,
          render: withRender ? render.id : null,
          pdf: pdf.id,
          pages: withRender ? null : 48,
          order,
        },
        depth: 0,
      })
    await catalog('second', FIRST + 1, true)
    await catalog('first', FIRST, false)
  })

  afterAll(async () => {
    await cleanup(payload)
  })

  it('is cached under the catalogs collection tag', () => {
    expect(caches).toContainEqual({ keys: ['collection:catalogs'], tags: ['collection:catalogs'] })
  })

  it('in the editor order, with the selected fields only', async () => {
    const docs = (await getCatalogs()).filter((d) => d.title.startsWith(PREFIX))
    expect(docs.map((d) => d.title)).toEqual([`${PREFIX} first`, `${PREFIX} second`])
    const [first, second] = docs
    expect(Object.keys(first!).sort()).toEqual(
      ['category', 'cover', 'id', 'order', 'pages', 'pdf', 'render', 'title'].sort(),
    )
    expect(first!.pages).toBe(48)
    expect(first!.render ?? null).toBeNull()
    expect(second!.pages ?? null).toBeNull()
  })

  it('media with url (needs filename), size, type and image sizes', async () => {
    const [first, second] = (await getCatalogs()).filter((d) => d.title.startsWith(PREFIX))
    const pdf = first!.pdf
    if (typeof pdf !== 'object') throw new Error('pdf is not populated')
    expect(pdf.url).toMatch(/^\/api\/media\/file\/.+\.pdf$/)
    expect(pdf.mimeType).toBe('application/pdf')
    expect(pdf.filesize).toBeGreaterThan(0)
    const cover = first!.cover
    if (typeof cover !== 'object') throw new Error('cover is not populated')
    expect(cover.url).not.toBeNull()
    expect(cover.alt).toBe('test')
    const render = second!.render
    if (!render || typeof render !== 'object') throw new Error('render is not populated')
    expect(render.url).not.toBeNull()
    expect(render.mimeType).toBe('image/png')
  })
})
