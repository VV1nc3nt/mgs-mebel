import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { cleanup, createImage, getTestPayload, PREFIX } from './helpers'

// The real next/cache: outside a Next request revalidateTag throws its «static generation store
// missing» invariant, and the cache hooks must skip it (seed, `payload run`, migrations).

let payload: Payload
let stats: Record<string, unknown>

beforeAll(async () => {
  payload = await getTestPayload()
  stats = (await payload.findGlobal({ slug: 'stats', depth: 0 })) as unknown as Record<
    string,
    unknown
  >
})

afterAll(async () => {
  if (!payload) return
  const items = stats.items as { value: string; label: string }[] | undefined
  if (items?.length) {
    await payload.updateGlobal({
      slug: 'stats',
      data: { items: items.map(({ value, label }) => ({ value, label })) },
    })
  } else {
    await payload.db.drizzle.execute(sql`delete from "stats"`)
  }
  await cleanup(payload)
})

describe('cache hooks outside a Next request', () => {
  it('saving a global and publishing, changing and deleting news do not throw', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'stats',
        data: { items: [{ value: '1', label: `${PREFIX} вне Next` }] },
      }),
    ).resolves.toBeTruthy()

    const cover = (await createImage(payload)).id
    const news = await payload.create({
      collection: 'news',
      data: {
        title: `${PREFIX} вне Next`,
        slug: `${PREFIX}-outside`.toLowerCase(),
        type: 'news',
        date: '2001-01-01',
        cover,
        _status: 'published',
      },
      draft: false,
    })
    await expect(
      payload.update({ collection: 'news', id: news.id, data: { _status: 'draft' } }),
    ).resolves.toBeTruthy()
    await expect(payload.delete({ collection: 'news', id: news.id })).resolves.toBeTruthy()
    await expect(
      payload.update({ collection: 'media', id: cover, data: { alt: `${PREFIX} alt` } }),
    ).resolves.toBeTruthy()
  })
})
