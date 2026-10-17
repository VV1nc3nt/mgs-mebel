import { sql } from '@payloadcms/db-postgres'
import { createLocalReq, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ALL_TAGS } from '@/lib/revalidate'

import { cleanup, createImage, getTestPayload, pdfFile, PREFIX } from './helpers'

// The cache hooks call revalidateTag; here it is a spy (outside Next it would only be skipped).
const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({
  revalidateTag,
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}))

const EXPIRE = { expire: 0 }
const tags = () => revalidateTag.mock.calls.map(([tag]) => tag as string)

let payload: Payload
let cover: number
// Page globals and stats are restored afterwards: other files read them.
const snapshots: Record<string, Record<string, unknown>> = {}
const RESTORED = ['catalogsPage', 'newsPage', 'stats'] as const

const strip = ({
  id: _i,
  createdAt: _c,
  updatedAt: _u,
  globalType: _g,
  ...data
}: Record<string, unknown>) => data

beforeAll(async () => {
  payload = await getTestPayload()
  for (const slug of RESTORED) {
    snapshots[slug] = (await payload.findGlobal({ slug, depth: 0 })) as unknown as Record<
      string,
      unknown
    >
  }
  cover = (await createImage(payload)).id
})

afterAll(async () => {
  if (!payload) return
  for (const slug of RESTORED) {
    const before = snapshots[slug]
    if (before?.createdAt) {
      const drafts = slug !== 'stats'
      await payload.updateGlobal({
        slug,
        data: { ...strip(before), ...(drafts && { _status: 'published' }) } as never,
      })
    } else {
      const table = slug.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
      if (slug !== 'stats') await payload.db.drizzle.execute(sql.raw(`delete from "_${table}_v"`))
      await payload.db.drizzle.execute(sql.raw(`delete from "${table}"`))
    }
  }
  await cleanup(payload)
})

beforeEach(() => revalidateTag.mockClear())

describe('globals', () => {
  it('a global without drafts expires its tag on every save', async () => {
    await payload.updateGlobal({
      slug: 'stats',
      data: { items: [{ value: '1', label: `${PREFIX} цифра` }] },
    })
    expect(revalidateTag.mock.calls).toEqual([['global:stats', EXPIRE]])
  })

  // Autosave is a draft save with `autosave: true` in the REST query; the hooks see the same args.
  it('page global: autosave and a saved draft keep the cache, publishing expires it', async () => {
    const hero = { title: `${PREFIX} каталоги` }
    await payload.updateGlobal({
      slug: 'catalogsPage',
      data: { hero },
      draft: true,
    })
    await payload.updateGlobal({ slug: 'catalogsPage', data: { hero }, draft: true })
    expect(revalidateTag).not.toHaveBeenCalled()

    await payload.updateGlobal({
      slug: 'catalogsPage',
      data: { hero, _status: 'published' },
      draft: true,
    })
    expect(revalidateTag.mock.calls).toEqual([['global:catalogsPage', EXPIRE]])
  })

  it('unpublishing a page global expires it, even with a draft as the latest version', async () => {
    const hero = { title: `${PREFIX} снятие` }
    await payload.updateGlobal({ slug: 'catalogsPage', data: { hero, _status: 'published' } })
    await payload.updateGlobal({ slug: 'catalogsPage', data: { hero }, draft: true })
    revalidateTag.mockClear()
    // «Снять с публикации» in the admin: `_status: draft` without the draft flag
    await payload.updateGlobal({ slug: 'catalogsPage', data: { _status: 'draft' } })
    expect(tags()).toEqual(['global:catalogsPage'])
  })

  it('the draft flag of one global does not leak into another write of the same request', async () => {
    const req = await createLocalReq({}, payload)
    await payload.updateGlobal({
      slug: 'catalogsPage',
      data: { hero: { title: `${PREFIX} автосохранение` } },
      draft: true,
      req,
    })
    expect(revalidateTag).not.toHaveBeenCalled()
    await payload.updateGlobal({
      slug: 'newsPage',
      data: { hero: { title: `${PREFIX} новости` }, _status: 'published' },
      req,
    })
    expect(tags()).toEqual(['global:newsPage'])
  })

  it('a seed write (context.disableRevalidate) never calls revalidateTag', async () => {
    await payload.updateGlobal({
      slug: 'catalogsPage',
      data: { hero: { title: `${PREFIX} seed` }, _status: 'published' },
      context: { disableRevalidate: true },
    })
    await payload.updateGlobal({
      slug: 'stats',
      data: { items: [{ value: '2', label: `${PREFIX} seed` }] },
      context: { disableRevalidate: true },
    })
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})

describe('news', () => {
  const slug = `${PREFIX}-news`.toLowerCase()
  // `cover` is created in beforeAll: read it when the test runs.
  const newsData = () => ({
    title: `${PREFIX} новость`,
    slug,
    type: 'news' as const,
    date: '2001-01-01',
    cover,
  })

  it('draft → publish → slug change → unpublish → delete', async () => {
    const draft = await payload.create({ collection: 'news', data: newsData(), draft: true })
    expect(revalidateTag).not.toHaveBeenCalled()

    await payload.update({
      collection: 'news',
      id: draft.id,
      data: { lead: 'черновик' },
      draft: true,
    })
    expect(revalidateTag).not.toHaveBeenCalled()

    await payload.update({ collection: 'news', id: draft.id, data: { _status: 'published' } })
    expect(revalidateTag.mock.calls).toEqual([
      ['collection:news', EXPIRE],
      [`news:${slug}`, EXPIRE],
    ])

    revalidateTag.mockClear()
    await payload.update({ collection: 'news', id: draft.id, data: { slug: `${slug}-new` } })
    expect(tags()).toEqual(['collection:news', `news:${slug}-new`, `news:${slug}`])

    // A saved draft is the latest version: unpublishing must still expire the page.
    await payload.update({ collection: 'news', id: draft.id, data: { lead: 'ещё' }, draft: true })
    revalidateTag.mockClear()
    await payload.update({ collection: 'news', id: draft.id, data: { _status: 'draft' } })
    expect(tags()).toEqual(['collection:news', `news:${slug}-new`])

    revalidateTag.mockClear()
    await payload.delete({ collection: 'news', id: draft.id })
    expect(tags()).toEqual(['collection:news', `news:${slug}-new`])
  })

  it('autosave of a published news keeps the cache, publishing the draft expires it', async () => {
    const doc = await payload.create({
      collection: 'news',
      data: { ...newsData(), slug: `${slug}-auto`, _status: 'published' },
      draft: false,
    })
    revalidateTag.mockClear()
    await payload.update({
      collection: 'news',
      id: doc.id,
      data: { lead: 'автосохранение' },
      draft: true,
      autosave: true,
    })
    await payload.update({
      collection: 'news',
      id: doc.id,
      data: { lead: 'ещё автосохранение' },
      draft: true,
      autosave: true,
    })
    expect(revalidateTag).not.toHaveBeenCalled()

    await payload.update({
      collection: 'news',
      id: doc.id,
      data: { _status: 'published' },
      draft: true,
    })
    expect(tags()).toEqual(['collection:news', `news:${slug}-auto`])
    await payload.delete({ collection: 'news', id: doc.id, context: { disableRevalidate: true } })
  })

  it('creating a published news expires the list', async () => {
    const doc = await payload.create({
      collection: 'news',
      data: { ...newsData(), slug: `${slug}-pub`, _status: 'published' },
      draft: false,
    })
    expect(tags()).toEqual(['collection:news', `news:${slug}-pub`])
    await payload.delete({ collection: 'news', id: doc.id, context: { disableRevalidate: true } })
  })
})

describe('collections without drafts and media', () => {
  it('catalogs: create, update and delete expire collection:catalogs', async () => {
    const pdf = await payload.create({ collection: 'media', data: {}, file: pdfFile() })
    revalidateTag.mockClear()
    const catalog = await payload.create({
      collection: 'catalogs',
      data: { title: `${PREFIX} каталог`, category: 'kitchens', cover, pdf: pdf.id },
    })
    await payload.update({ collection: 'catalogs', id: catalog.id, data: { pages: 10 } })
    await payload.delete({ collection: 'catalogs', id: catalog.id })
    expect(revalidateTag.mock.calls).toEqual([
      ['collection:catalogs', EXPIRE],
      ['collection:catalogs', EXPIRE],
      ['collection:catalogs', EXPIRE],
    ])
  })

  it('media: a new file expires nothing, a changed one expires all site data', async () => {
    const image = await createImage(payload)
    expect(revalidateTag).not.toHaveBeenCalled()
    await payload.update({ collection: 'media', id: image.id, data: { alt: `${PREFIX} alt` } })
    expect(tags()).toEqual([...ALL_TAGS])
  })
})
