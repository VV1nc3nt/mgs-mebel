import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import type { NewsPage, User } from '@/payload-types'

import { SeedStats } from '@/seed/stats'
import { upsertGlobal } from '@/seed/upsert'

import { cleanup, createRoleUsers, getTestPayload, PREFIX } from './helpers'

// Outside a Next request: no request scope, no incremental cache; draft mode is switched per test.
const draft = vi.hoisted(() => ({ enabled: false, headers: new Headers() }))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  // Writes in these tests go through the cache hooks (lib/revalidate.ts)
  revalidateTag: () => {},
}))
vi.mock('next/headers', () => ({
  draftMode: async () => ({ isEnabled: draft.enabled }),
  headers: async () => draft.headers,
}))

const { getPageGlobal } = await import('@/lib/queries')

// newsPage is a small page global; the test needs it in a known state and restores it afterwards.
const SLUG = 'newsPage'
let payload: Payload
let users: Awaited<ReturnType<typeof createRoleUsers>>
let before: NewsPage

const as = (user: User | null) => ({ user, overrideAccess: false })
const anonymous = { overrideAccess: false } as const

/** Removes the global and its versions, as on a fresh database. */
const wipe = async () => {
  await payload.db.drizzle.execute(sql`delete from "_news_page_v"`)
  await payload.db.drizzle.execute(sql`delete from "news_page"`)
}

const loginHeaders = async (user: User) => {
  const { token } = await payload.login({
    collection: 'users',
    data: { email: user.email, password: 'test-password' },
  })
  return new Headers({ Authorization: `JWT ${token}` })
}

beforeAll(async () => {
  payload = await getTestPayload()
  users = await createRoleUsers(payload)
  before = await payload.findGlobal({ slug: SLUG, depth: 0 })
})

afterAll(async () => {
  if (!payload) return
  await wipe()
  if (before?.createdAt) {
    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      globalType: _g,
      ...data
    } = before as NewsPage & {
      globalType?: string
    }
    await payload.updateGlobal({ slug: SLUG, data: { ...data, _status: 'published' } })
  }
  await cleanup(payload)
})

describe('page globals: drafts', () => {
  it('a first draft on a fresh database creates no published row', async () => {
    await wipe()
    await payload.updateGlobal({
      slug: SLUG,
      data: { hero: { title: `${PREFIX} первый черновик` } },
      draft: true,
      ...as(users.content),
    })
    const [row] = (
      await payload.db.drizzle.execute(sql`select count(*)::int as n from "news_page"`)
    ).rows as { n: number }[]
    expect(row.n).toBe(0)

    // Site (published read) and anonymous API, with and without ?draft=true: nothing
    draft.enabled = false
    expect((await getPageGlobal(SLUG)).hero?.title).toBeUndefined()
    for (const isDraft of [false, true]) {
      const doc = await payload.findGlobal({ slug: SLUG, draft: isDraft, ...anonymous })
      expect(doc.hero?.title).toBeUndefined()
    }
    // The editor sees the draft
    const own = await payload.findGlobal({ slug: SLUG, draft: true, ...as(users.content) })
    expect(own.hero?.title).toBe(`${PREFIX} первый черновик`)
  })

  it('a draft over a published version stays invisible to the site and anonymous users', async () => {
    await wipe()
    await payload.updateGlobal({
      slug: SLUG,
      data: { hero: { title: `${PREFIX} опубликовано` }, _status: 'published' },
      ...as(users.content),
    })
    await payload.updateGlobal({
      slug: SLUG,
      data: { hero: { title: `${PREFIX} черновик` } },
      draft: true,
      ...as(users.content),
    })

    draft.enabled = false
    expect((await getPageGlobal(SLUG)).hero?.title).toBe(`${PREFIX} опубликовано`)
    for (const isDraft of [false, true]) {
      const doc = await payload.findGlobal({ slug: SLUG, draft: isDraft, ...anonymous })
      expect(doc.hero?.title).toBe(`${PREFIX} опубликовано`)
    }

    // Draft mode: only an editor with a valid session gets the draft
    draft.enabled = true
    draft.headers = new Headers()
    expect((await getPageGlobal(SLUG)).hero?.title).toBe(`${PREFIX} опубликовано`)
    draft.headers = await loginHeaders(users.manager)
    expect((await getPageGlobal(SLUG)).hero?.title).toBe(`${PREFIX} опубликовано`)
    draft.headers = await loginHeaders(users.content)
    expect((await getPageGlobal(SLUG)).hero?.title).toBe(`${PREFIX} черновик`)
    draft.enabled = false
  })

  it('version history is for editing roles only', async () => {
    await expect(payload.findGlobalVersions({ slug: SLUG, ...anonymous })).rejects.toThrow()
    await expect(payload.findGlobalVersions({ slug: SLUG, ...as(users.manager) })).rejects.toThrow()
    for (const user of [users.content, users.admin, users.developer]) {
      const { totalDocs } = await payload.findGlobalVersions({ slug: SLUG, ...as(user) })
      expect(totalDocs).toBeGreaterThan(0)
    }
  })

  it('manager can neither publish nor save a draft', async () => {
    for (const isDraft of [false, true]) {
      await expect(
        payload.updateGlobal({
          slug: SLUG,
          data: { hero: { title: 'x' }, ...(isDraft ? {} : { _status: 'published' as const }) },
          draft: isDraft,
          ...as(users.manager),
        }),
      ).rejects.toThrow()
    }
  })
})

describe('seed: page globals are published', () => {
  const data = { hero: { title: `${PREFIX} из seed` } }
  const anonymousTitle = async () =>
    (await payload.findGlobal({ slug: SLUG, draft: true, ...anonymous })).hero?.title

  it('publishes, then skips; re-publishes a stored draft', async () => {
    await wipe()
    const stats = new SeedStats()
    await upsertGlobal(payload, stats, SLUG, data)
    expect(await anonymousTitle()).toBe(data.hero.title)
    await upsertGlobal(payload, stats, SLUG, data)
    expect(stats.table()).toMatch(/newsPage\s+created\s+0\s+updated\s+1\s+skipped\s+1/)

    // Same content, but the stored row is a draft (as right after drafts were enabled)
    await payload.db.drizzle.execute(sql`update "news_page" set "_status" = 'draft'`)
    expect(await anonymousTitle()).toBeUndefined()
    await upsertGlobal(payload, stats, SLUG, data)
    expect(await anonymousTitle()).toBe(data.hero.title)
  })
})
