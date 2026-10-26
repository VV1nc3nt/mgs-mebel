import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { linkHref, type LinkFields } from '@/lib/article'
import type { User } from '@/payload-types'

import { heading, legalText, link, list, newsLink, paragraph } from '../helpers/e2eLegal'
import { cleanup, createImage, createRoleUsers, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope; draft mode and the editor session are switched here.
// revalidateTag is a spy, the cache records its keys and tags and calls through.
const state = vi.hoisted(() => ({
  draft: false,
  editor: false,
  cached: [] as { keys: string[]; tags: string[] }[],
}))
const revalidateTag = vi.hoisted(() => vi.fn())
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: state.draft }) }))
vi.mock('@/lib/preview', () => ({
  getPreviewUser: async () => (state.editor ? { id: 1, role: 'content' } : null),
}))
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(
    fn: T,
    keys: string[],
    { tags }: { tags: string[] },
  ) => {
    state.cached.push({ keys, tags })
    return fn
  },
  revalidateTag,
}))

const { getLegalDoc, getLegalLinks } = await import('@/lib/queries')

const TABLES = ['legal_privacy', 'legal_cookies', 'legal_offer']

let payload: Payload
let users: Awaited<ReturnType<typeof createRoleUsers>>

const as = (user: User | null) => ({ user, overrideAccess: false })
const tags = () => revalidateTag.mock.calls.map(([tag]) => tag as string)

/** Removes the documents and their versions, as on a fresh database. */
const wipe = async () => {
  for (const table of TABLES) {
    await payload.db.drizzle.execute(sql.raw(`delete from "_${table}_v"`))
    await payload.db.drizzle.execute(sql.raw(`delete from "${table}"`))
  }
}

const body = (value: string) => legalText(paragraph(value))

const publish = (
  slug: 'legalPrivacy' | 'legalCookies' | 'legalOffer',
  data: Record<string, unknown>,
) => payload.updateGlobal({ slug, data: { ...data, _status: 'published' } as never, depth: 0 })

beforeAll(async () => {
  payload = await getTestPayload()
  users = await createRoleUsers(payload)
  await wipe()
})

afterAll(async () => {
  if (!payload) return
  await wipe()
  await cleanup(payload)
})

beforeEach(() => {
  revalidateTag.mockClear()
  state.draft = false
  state.editor = false
  state.cached = []
})

describe('legal documents: schema', () => {
  it('the migration created a table and a versions table per document', async () => {
    for (const table of TABLES) {
      for (const name of [table, `_${table}_v`]) {
        const { rows } = await payload.db.drizzle.execute(
          sql.raw(`select to_regclass('public.${name}')::text as t`),
        )
        expect((rows[0] as { t: string | null }).t).toBe(name)
      }
    }
  })

  it('publishing needs a title and a text; a draft without them is saved', async () => {
    await expect(publish('legalPrivacy', { body: body('Текст') })).rejects.toThrow()
    await expect(publish('legalPrivacy', { title: `${PREFIX} документ` })).rejects.toThrow()
    await payload.updateGlobal({
      slug: 'legalPrivacy',
      data: { body: body('Только текст черновика') },
      draft: true,
      depth: 0,
    })
    const draft = await payload.findGlobal({ slug: 'legalPrivacy', draft: true, depth: 0 })
    expect(draft.title ?? null).toBeNull()
  })

  it('the text takes paragraphs, H2 / H3, lists and links only', async () => {
    const title = `${PREFIX} документ`
    await expect(
      publish('legalOffer', {
        title,
        body: legalText(
          paragraph('Абзац'),
          heading('h2', 'H2'),
          heading('h3', 'H3'),
          list('bullet', ['a']),
          list('number', ['b']),
          paragraph(link({ linkType: 'custom', newTab: true, url: 'https://example.org' }, 'x')),
        ),
      }),
    ).resolves.toBeTruthy()
    // Refused by the editor's own node validation (heading tags) or by allowedNodesOnly
    for (const foreign of [
      heading('h1', 'Второй H1'),
      heading('h4', 'H4'),
      list('check', ['чекбокс']),
      { type: 'quote', version: 1, children: [] },
    ]) {
      const error = await publish('legalOffer', { title, body: legalText(foreign) }).catch(
        (e: { data?: { errors?: { message: string }[] } }) => e,
      )
      const message = (error as { data?: { errors?: { message: string }[] } }).data?.errors?.[0]
        ?.message
      expect(message, JSON.stringify(foreign)).toMatch(/h2, h3|найдено/)
    }
  })
})

describe('legal documents: access', () => {
  it('content and admin publish, manager only reads', async () => {
    for (const user of [users.content, users.admin, users.developer]) {
      await expect(
        payload.updateGlobal({
          slug: 'legalCookies',
          data: { title: `${PREFIX} ${user.role}`, body: body('Текст'), _status: 'published' },
          ...as(user),
        }),
      ).resolves.toBeTruthy()
    }
    await expect(
      payload.updateGlobal({
        slug: 'legalCookies',
        data: { title: `${PREFIX} manager` },
        ...as(users.manager),
      }),
    ).rejects.toThrow()
    const read = await payload.findGlobal({ slug: 'legalCookies', ...as(users.manager) })
    expect(read.title).toBe(`${PREFIX} developer`)
  })

  it('an anonymous visitor reads the published version only', async () => {
    await publish('legalCookies', { title: `${PREFIX} опубликовано`, body: body('Текст') })
    await payload.updateGlobal({
      slug: 'legalCookies',
      data: { title: `${PREFIX} черновик` },
      draft: true,
      depth: 0,
    })
    const anonymous = await payload.findGlobal({
      slug: 'legalCookies',
      overrideAccess: false,
      draft: true,
    })
    expect(anonymous.title).toBe(`${PREFIX} опубликовано`)
    expect((await getLegalDoc('cookies'))?.title).toBe(`${PREFIX} опубликовано`)
  })
})

describe('legal documents: cache', () => {
  it('publishing expires the tag of the document, an autosave does not', async () => {
    await payload.updateGlobal({
      slug: 'legalOffer',
      data: { title: `${PREFIX} автосохранение` },
      draft: true,
      depth: 0,
    })
    expect(revalidateTag).not.toHaveBeenCalled()
    await publish('legalOffer', { title: `${PREFIX} оферта`, body: body('Текст оферты') })
    expect(tags()).toEqual(['global:legalOffer'])
  })

  it('a document entry is tagged with its global and the news (the links of its text)', async () => {
    await getLegalLinks()
    expect(state.cached).toContainEqual({
      keys: ['global:page', 'legalPrivacy'],
      tags: ['global:legalPrivacy', 'collection:news'],
    })
  })
})

describe('getLegalDoc / getLegalLinks', () => {
  it('links only the published documents with a title and a text', async () => {
    await wipe()
    await publish('legalPrivacy', { title: `${PREFIX} политика`, body: body('Текст политики') })
    // Published, then a draft with a new title: the link keeps the published one
    await payload.updateGlobal({
      slug: 'legalPrivacy',
      data: { title: `${PREFIX} черновик политики` },
      draft: true,
      depth: 0,
    })
    // Cookies — a draft only; the offer — an empty paragraph as its text
    await payload.updateGlobal({
      slug: 'legalCookies',
      data: { title: `${PREFIX} cookies`, body: body('Текст') },
      draft: true,
      depth: 0,
    })
    await publish('legalOffer', { title: `${PREFIX} оферта`, body: body('   ') })
    expect(await getLegalLinks()).toEqual({
      privacy: { href: '/privacy', title: `${PREFIX} политика` },
    })
    expect(await getLegalDoc('offer')).toBeNull()
    expect(await getLegalDoc('cookies')).toBeNull()

    // An editor in draft mode sees the draft page; the links never show a draft
    state.draft = true
    state.editor = true
    expect((await getLegalDoc('cookies'))?.title).toBe(`${PREFIX} cookies`)
    expect(Object.keys(await getLegalLinks())).toEqual(['privacy'])
  })

  it('a link to a news never published stays text, to a published one leads to its page', async () => {
    const image = await createImage(payload)
    const news = (name: string, published: boolean) =>
      payload.create({
        collection: 'news',
        data: {
          title: `${PREFIX} ${name}`,
          slug: `${PREFIX}-legal-${name}`.toLowerCase(),
          type: 'news',
          date: '2099-03-01T12:00:00.000Z',
          cover: image.id,
          ...(published && { _status: 'published' }),
        } as never,
        ...(published ? {} : { draft: true }),
        depth: 0,
      })
    const shown = await news('shown', true)
    const hidden = await news('hidden', false)
    await publish('legalPrivacy', {
      title: `${PREFIX} политика`,
      body: legalText(
        paragraph(newsLink(shown.id, 'опубликованная'), ' ', newsLink(hidden.id, 'черновик')),
      ),
    })
    const doc = await getLegalDoc('privacy')
    const links = (
      doc!.body.root.children[0] as unknown as { children: { type: string; fields?: LinkFields }[] }
    ).children.filter((node) => node.type === 'link')
    expect(links.map((node) => linkHref(node.fields))).toEqual([
      { kind: 'internal', href: `/news/${shown.slug}` },
      null,
    ])
  })
})
