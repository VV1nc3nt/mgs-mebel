import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { News } from '@/payload-types'
import { readingTime } from '@/lib/readingTime'
import { slugify } from '@/lib/slugify'

import { cleanup, createImage, getTestPayload, PREFIX } from './helpers'

const paragraph = (text: string) =>
  ({
    blockType: 'paragraph',
    text: {
      root: {
        type: 'root',
        direction: null,
        format: '',
        indent: 0,
        version: 1,
        children: [
          {
            type: 'paragraph',
            direction: null,
            format: '',
            indent: 0,
            version: 1,
            children: [
              { type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 },
            ],
          },
        ],
      },
    },
  }) as NonNullable<News['body']>[number]

const words = (n: number) => Array.from({ length: n }, () => 'слово').join(' ')

describe('slugify', () => {
  it('transliterates Cyrillic', () => {
    expect(slugify('Выставка ARTDOM 2026')).toBe('vystavka-artdom-2026')
    expect(slugify('Щука и ёж: съезд «Жизнь»')).toBe('shchuka-i-ezh-sezd-zhizn')
    expect(slugify('  Кухня — гостиная  ')).toBe('kukhnya-gostinaya')
  })
})

describe('readingTime', () => {
  it('is at least one minute', () => {
    expect(readingTime([])).toBe(1)
    expect(readingTime(undefined)).toBe(1)
  })

  it('counts text blocks and rounds up', () => {
    expect(readingTime([paragraph(words(180))])).toBe(1)
    expect(readingTime([paragraph(words(181))])).toBe(2)
    expect(
      readingTime([
        paragraph(words(100)),
        { blockType: 'heading', text: words(30) },
        { blockType: 'list', items: [{ text: words(30) }, { text: words(30) }] },
        { blockType: 'quote', text: words(9), author: 'Автор' },
      ]),
    ).toBe(2)
  })
})

describe('news hooks', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  afterAll(async () => {
    await cleanup(payload)
  })

  it('generates a transliterated slug and reading time on create', async () => {
    const cover = await createImage(payload)
    const news = await payload.create({
      collection: 'news',
      data: {
        title: `${PREFIX} Открытие салона`,
        type: 'news',
        date: '2026-01-01',
        cover: cover.id,
        body: [paragraph(words(400))],
        _status: 'published',
        // No slug: it is generated from the title.
      } as Omit<News, 'id' | 'slug' | 'createdAt' | 'updatedAt'> as News,
    })
    expect(news.slug).toBe(slugify(`${PREFIX} Открытие салона`))
    expect(news.slug).toMatch(/otkrytie-salona$/)
    expect(news.readingTime).toBe(3)
  })
})
