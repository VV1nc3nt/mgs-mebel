import { sql } from '@payloadcms/db-postgres'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import type { Payload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { ensureCached, missingFiles } from '@/seed/cache'

import { catalogs } from '@/seed/data/catalogs'
import { globals } from '@/seed/data/globals'
import { news } from '@/seed/data/news'
import { projects } from '@/seed/data/projects'
import { salons } from '@/seed/data/salons'
import type { MediaId } from '@/seed/data/types'
import { isSame } from '@/seed/compare'
import { isLocalDatabaseUrl, isSeedAllowed } from '@/seed/guard'
import { seedFiles } from '@/seed/index'
import { placeholderPdf } from '@/seed/pdf'
import { seoDescription, seoTitle } from '@/seed/seo'
import { SeedStats } from '@/seed/stats'
import { upsertGlobal } from '@/seed/upsert'

import { cleanup, createImage, createVideo, getTestPayload, PREFIX } from './helpers'

describe('seed guard', () => {
  it('allows only a local database', () => {
    expect(isLocalDatabaseUrl('postgres://mgs:mgs@localhost:5432/mgs')).toBe(true)
    expect(isLocalDatabaseUrl('postgres://mgs:mgs@127.0.0.1/mgs')).toBe(true)
    expect(isLocalDatabaseUrl('postgres://mgs:mgs@[::1]:5432/mgs')).toBe(true)
    expect(isLocalDatabaseUrl('postgres://mgs:mgs@5.180.174.123:5432/mgs')).toBe(false)
    expect(isLocalDatabaseUrl('postgres://mgs:mgs@postgres:5432/mgs')).toBe(false)
    expect(isLocalDatabaseUrl(undefined)).toBe(false)
    expect(isLocalDatabaseUrl('not a url')).toBe(false)
  })

  it('allows a remote database only with ENABLE_DEMO_SEED=true', () => {
    const local = 'postgres://mgs:mgs@localhost:5432/mgs'
    const staging = 'postgres://mgs:mgs@postgres:5432/mgs'
    expect(isSeedAllowed({ DATABASE_URL: local })).toBe(true)
    expect(isSeedAllowed({ DATABASE_URL: staging, ENABLE_DEMO_SEED: 'true' })).toBe(true)
    expect(isSeedAllowed({ DATABASE_URL: staging })).toBe(false)
    expect(isSeedAllowed({ DATABASE_URL: staging, ENABLE_DEMO_SEED: 'false' })).toBe(false)
    expect(isSeedAllowed({ DATABASE_URL: staging, ENABLE_DEMO_SEED: '1' })).toBe(false)
    expect(isSeedAllowed({ DATABASE_URL: staging, ENABLE_DEMO_SEED: 'TRUE' })).toBe(false)
    expect(isSeedAllowed({})).toBe(false)
  })
})

describe('seed cache, offline', () => {
  let dir: string
  const [present, absent] = seedFiles.filter((file) => file.kind === 'image')

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mgs-seed-cache-'))
    await fs.writeFile(path.join(dir, present.filename), 'x')
    await fs.writeFile(path.join(dir, absent.filename), '')
    vi.stubEnv('SEED_CACHE_DIR', dir)
    vi.stubEnv('SEED_OFFLINE', 'true')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('lists missing and empty files', async () => {
    expect(await missingFiles([present, absent], dir)).toEqual([absent])
  })

  it('takes cached files and fails on missing ones without network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    expect(await ensureCached(present, () => {})).toBe(path.join(dir, present.filename))
    await expect(ensureCached(absent, () => {})).rejects.toThrow(absent.filename)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not generate placeholder PDFs into the cache', async () => {
    const pdf = seedFiles.find((file) => file.kind === 'pdf')!
    await expect(ensureCached(pdf, () => {})).rejects.toThrow(pdf.filename)
    expect(await missingFiles([pdf], dir)).toEqual([pdf])
  })
})

/** H1 of a page hero: the first segment of the home scene or the single hero of other pages. */
const heroTitle = (hero: unknown) => {
  const h = hero as { title?: string; slides?: { title?: string }[] } | undefined
  return h?.slides ? h.slides[0]?.title : h?.title
}

describe('seed manifest and data', () => {
  const known = new Set(seedFiles.map((file) => file.key))
  const id: MediaId = (key) => {
    if (!known.has(key)) throw new Error(`unknown media key ${key}`)
    return 1
  }

  it('has unique file names that end with a letter', () => {
    const names = seedFiles.map((file) => file.filename)
    expect(new Set(names).size).toBe(names.length)
    for (const name of names) expect(name).toMatch(/^mgs-seed-[a-z0-9-]*[a-z]\.(jpg|mp4|pdf)$/)
  })

  it('references only media from the manifest', () => {
    expect(() => [salons(id), projects(id), news(id), catalogs(id), globals(id)]).not.toThrow()
  })

  it('has unique document keys', () => {
    const slugs = projects(id).map((doc) => doc.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    const titles = projects(id).map((doc) => doc.meta?.title)
    expect(new Set(titles).size).toBe(titles.length)
    const newsSlugs = news(id).map((doc) => doc.slug)
    expect(new Set(newsSlugs).size).toBe(newsSlugs.length)
  })

  it('keeps SEO titles within 60 and descriptions within 160 characters', () => {
    const metas = [
      ...projects(id).map((doc) => doc.meta),
      ...news(id).map((doc) => doc.meta),
      ...Object.values(globals(id)).map((data) => (data as { meta?: unknown }).meta),
    ].filter(Boolean) as { title?: string; description?: string }[]
    expect(metas.length).toBe(30 + 7 + 7)
    for (const meta of metas) {
      expect(meta.title?.length).toBeLessThanOrEqual(60)
      expect(meta.description?.length ?? 0).toBeLessThanOrEqual(160)
    }
  })
})

describe('seoTitle / seoDescription', () => {
  it('adds the brand and drops it when the title gets too long', () => {
    expect(seoTitle('Каталоги продукции')).toBe('Каталоги продукции — MGS MEBEL')
    expect(seoTitle('Салоны', 'start')).toBe('MGS MEBEL — Салоны')
    expect(seoTitle('Мы — MGS MEBEL', 'start')).toBe('Мы — MGS MEBEL')
    expect(seoTitle('Ваш дизайн.\nНаши возможности.')).toBe(
      'Ваш дизайн. Наши возможности. — MGS MEBEL',
    )
    const long = 'Очень длинный заголовок проекта, который не помещается в шестьдесят знаков'
    expect(seoTitle(long)).toBe(long)
  })

  it('cuts descriptions at a word boundary without an ellipsis', () => {
    expect(seoDescription(undefined)).toBeUndefined()
    expect(seoDescription('Короткий текст.')).toBe('Короткий текст.')
    const text = `${'слово '.repeat(40)}конец`
    const cut = seoDescription(text) as string
    expect(cut.length).toBeLessThanOrEqual(160)
    expect(text.startsWith(cut)).toBe(true)
    expect(cut.endsWith('слово')).toBe(true)
  })

  it('prefers the end of a sentence when it is not too short', () => {
    const first = `${'Первое предложение'.repeat(5)}.`
    const text = `${first} ${'второе '.repeat(20)}`
    expect(seoDescription(text)).toBe(first)
    const short = `Коротко. ${'слово '.repeat(40)}`
    expect(seoDescription(short)?.endsWith('слово')).toBe(true)
  })
})

describe('isSame', () => {
  const desired = {
    title: 'Проект',
    date: '2026-02-19T12:00:00.000Z',
    cover: 5,
    slides: [{ type: 'photo', file: 1 }],
    body: [{ blockType: 'heading', text: 'Заголовок' }],
  }
  const stored = {
    id: 10,
    createdAt: '2026-09-26T00:00:00.000Z',
    updatedAt: '2026-09-26T00:00:00.000Z',
    _status: 'published',
    title: 'Проект',
    place: null,
    date: '2026-02-19T12:00:00+00:00',
    cover: { id: 5, filename: 'x.jpg' },
    slides: [{ id: 'row-1', type: 'photo', file: 1, poster: null }],
    body: [{ id: 'block-1', blockName: null, blockType: 'heading', text: 'Заголовок' }],
  }

  it('ignores ids, timestamps, empty fields and populated relations', () => {
    expect(isSame(stored, desired)).toBe(true)
  })

  it('detects changed values and extra rows', () => {
    expect(isSame({ ...stored, title: 'Другой' }, desired)).toBe(false)
    expect(isSame({ ...stored, slides: [...stored.slides, stored.slides[0]] }, desired)).toBe(false)
    expect(isSame({ ...stored, body: [] }, desired)).toBe(false)
  })
})

describe('placeholderPdf', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  afterAll(async () => {
    await cleanup(payload)
  })

  it('builds a valid PDF with a correct xref offset', () => {
    const pdf = placeholderPdf('Кухни 2026').toString('latin1')
    expect(pdf.startsWith('%PDF-1.4')).toBe(true)
    expect(pdf.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(pdf).toContain('(Kukhni 2026)')
    const startxref = Number(pdf.match(/startxref\n(\d+)/)?.[1])
    expect(pdf.slice(startxref, startxref + 4)).toBe('xref')
  })

  it('is accepted by media as application/pdf', async () => {
    const data = placeholderPdf('Шкафы-купе')
    const doc = await payload.create({
      collection: 'media',
      data: {},
      file: { data, mimetype: 'application/pdf', name: `${PREFIX}-catalog.pdf`, size: data.length },
    })
    expect(doc.mimeType).toBe('application/pdf')
  })
})

describe('seed: page globals', () => {
  const PAGES = {
    home: 'home',
    about: 'about',
    salonsPage: 'salons_page',
    worksPage: 'works_page',
    catalogsPage: 'catalogs_page',
    designers: 'designers',
    newsPage: 'news_page',
  } as const
  type Page = keyof typeof PAGES
  const slugs = Object.keys(PAGES) as Page[]

  let payload: Payload
  const before = new Map<Page, Record<string, unknown>>()

  beforeAll(async () => {
    payload = await getTestPayload()
    for (const slug of slugs) {
      before.set(
        slug,
        (await payload.findGlobal({ slug, depth: 0 })) as unknown as Record<string, unknown>,
      )
    }
  })

  // Put the stored globals back; ones that did not exist are removed with their versions,
  // so the test media can be deleted.
  afterAll(async () => {
    if (!payload) return
    for (const slug of slugs) {
      const doc = before.get(slug)
      if (doc?.createdAt) {
        const { id: _id, createdAt: _c, updatedAt: _u, globalType: _g, ...data } = doc
        await payload.updateGlobal({ slug, data: { ...data, _status: 'published' } as never })
      } else {
        await payload.db.drizzle.execute(sql.raw(`delete from "_${PAGES[slug]}_v"`))
        await payload.db.drizzle.execute(sql.raw(`delete from "${PAGES[slug]}"`))
      }
    }
    await cleanup(payload)
  })

  it('publishes all page globals; a repeated run skips them', async () => {
    // Every manifest file is replaced by one test file of the same kind.
    const image = await createImage(payload, `${PREFIX}-seed-image.png`)
    const video = await createVideo(payload, `${PREFIX}-seed-video.mp4`)
    const kinds = new Map(seedFiles.map((file) => [file.key, file.kind]))
    const id: MediaId = (key) => (kinds.get(key) === 'video' ? video.id : image.id)
    const data = globals(id)

    const run = async () => {
      const stats = new SeedStats()
      for (const slug of slugs) {
        await upsertGlobal(payload, stats, slug, data[slug] as Record<string, unknown>)
      }
      return stats.table()
    }

    const first = await run()
    for (const slug of slugs) {
      const stored = await payload.findGlobal({ slug, depth: 0, overrideAccess: false })
      expect(stored._status, slug).toBe('published')
      expect(heroTitle(stored.hero), slug).toBe(heroTitle(data[slug].hero))
      expect(first).toMatch(new RegExp(`${slug}\\s+created\\s+0\\s+updated\\s+1\\s+skipped\\s+0`))
    }
    const second = await run()
    for (const slug of slugs) {
      expect(second).toMatch(new RegExp(`${slug}\\s+created\\s+0\\s+updated\\s+0\\s+skipped\\s+1`))
    }
  })
})
