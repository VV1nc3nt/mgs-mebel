import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Media } from '@/payload-types'
import { cleanup, createImage, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope; draft mode and the editor session are switched here,
// the cache records the keys it is asked for.
const state = vi.hoisted(() => ({ draft: false, editor: false, cached: [] as string[][] }))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: state.draft }) }))
vi.mock('@/lib/preview', () => ({
  getPreviewUser: async () => (state.editor ? { id: 1, role: 'content' } : null),
}))
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T, keys: string[]) => {
    state.cached.push(keys)
    return fn
  },
  revalidateTag: () => {},
}))

const { getNewsBySlug } = await import('@/lib/queries')

const slug = (name: string) => `${PREFIX}-${name}`.toLowerCase()

const text = (value: string) => ({ type: 'text', text: value, format: 0, version: 1 })
const internal = (id: number, label: string) => ({
  type: 'link',
  version: 3,
  fields: { linkType: 'internal', newTab: false, doc: { relationTo: 'news', value: id } },
  children: [text(label)],
})
const rich = (...children: unknown[]) => ({
  root: {
    type: 'root',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    children: [
      {
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        children,
      },
    ],
  },
})

describe('getNewsBySlug', () => {
  let payload: Payload
  let image: Media

  const create = (name: string, data: Record<string, unknown>, published = true) =>
    payload.create({
      collection: 'news',
      data: {
        title: `${PREFIX} ${name}`,
        slug: slug(name),
        type: 'news',
        date: '2099-03-01T12:00:00.000Z',
        cover: image.id,
        ...(published && { _status: 'published' }),
        ...data,
      } as never,
      ...(published ? {} : { draft: true }),
      depth: 0,
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    image = await createImage(payload)
    const linked = await create('linked', {})
    const hidden = await create('hidden', {}, false)
    await create('article', {
      type: 'new',
      lead: 'Лид статьи',
      body: [
        {
          blockType: 'paragraph',
          text: rich(text('См. '), internal(linked.id, 'новость'), internal(hidden.id, 'черновик')),
        },
        { blockType: 'media', photos: [image.id], caption: 'Подпись' },
      ],
    })
    // Published, then a draft edit (Live Preview, autosave)
    const edited = await create('edited', {})
    await payload.update({
      collection: 'news',
      id: edited.id,
      data: { title: `${PREFIX} edited draft` },
      draft: true,
      autosave: true,
    })
    await create('never', {}, false)
  })

  afterAll(async () => {
    if (payload) await cleanup(payload)
  })

  beforeEach(() => {
    state.draft = false
    state.editor = false
    state.cached = []
  })

  it('the article with its body, type, reading time and dates; media with urls', async () => {
    const news = await getNewsBySlug(slug('article'))
    expect(news).toMatchObject({
      title: `${PREFIX} article`,
      slug: slug('article'),
      type: 'new',
      lead: 'Лид статьи',
      readingTime: 1,
    })
    expect(news?.updatedAt).toEqual(expect.any(String))
    expect(news).not.toHaveProperty('coverVideo')
    const cover = news?.cover as Media
    expect(cover.url).toEqual(expect.stringMatching(/^\/api\/media\/file\//))
    expect(cover.sizes?.card?.url).toEqual(expect.any(String))
    expect(cover).toHaveProperty('alt')
    const [paragraph, media] = news!.body!
    if (media?.blockType !== 'media') throw new Error('media block expected')
    const photo = media.photos[0] as Media
    expect(photo.url).toEqual(expect.any(String))
    expect(photo.width).toEqual(expect.any(Number))
    // Links: the published news populated with its slug; a draft one only as an id
    const nodes = JSON.stringify(paragraph)
    expect(nodes).toContain(`"slug":"${slug('linked')}"`)
    expect(nodes).not.toContain(`"slug":"${slug('hidden')}"`)
    expect(state.cached).toEqual([['collection:news:article', slug('article')]])
  })

  it('anonymous: published only, also with the draft mode cookie', async () => {
    expect(await getNewsBySlug(slug('never'))).toBeNull()
    expect((await getNewsBySlug(slug('edited')))?.title).toBe(`${PREFIX} edited`)
    state.draft = true
    expect(await getNewsBySlug(slug('never'))).toBeNull()
    expect((await getNewsBySlug(slug('edited')))?.title).toBe(`${PREFIX} edited`)
  })

  it('an editor in draft mode: the latest version straight from the database', async () => {
    state.draft = true
    state.editor = true
    expect((await getNewsBySlug(slug('never')))?.title).toBe(`${PREFIX} never`)
    expect((await getNewsBySlug(slug('edited')))?.title).toBe(`${PREFIX} edited draft`)
    expect(state.cached).toEqual([])
    // An editor session without draft mode: the published version
    state.draft = false
    expect((await getNewsBySlug(slug('edited')))?.title).toBe(`${PREFIX} edited`)
  })

  it('a made-up slug: null before the cache', async () => {
    expect(await getNewsBySlug('Bad_Slug')).toBeNull()
    expect(await getNewsBySlug(slug('nesushchestvuet'))).toBeNull()
    expect(state.cached).toEqual([['collection:news:article', slug('nesushchestvuet')]])
  })
})
