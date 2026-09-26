import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { catalogs } from '@/seed/data/catalogs'
import { globals } from '@/seed/data/globals'
import { news } from '@/seed/data/news'
import { projects } from '@/seed/data/projects'
import { salons } from '@/seed/data/salons'
import type { MediaId } from '@/seed/data/types'
import { isSame } from '@/seed/compare'
import { isLocalDatabaseUrl } from '@/seed/guard'
import { seedFiles } from '@/seed/index'
import { placeholderPdf } from '@/seed/pdf'
import { seoDescription, seoTitle } from '@/seed/seo'

import { cleanup, getTestPayload, PREFIX } from './helpers'

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
})

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
